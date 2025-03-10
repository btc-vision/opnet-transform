import { Transform } from 'assemblyscript/transform';
import {
    ClassDeclaration,
    FieldDeclaration,
    MethodDeclaration,
    NodeKind,
    Parser,
    Program,
    Statement,
} from 'assemblyscript/dist/assemblyscript.js';
import { fs } from 'assemblyscript/util/node.js';
// @ts-ignore
import { SimpleParser } from '@btc-vision/visitor-as';
import { IdentifierExpression } from 'types:assemblyscript/src/ast';
import { ElementKind, FunctionPrototype } from 'types:assemblyscript/src/program';

import { ABIDataTypes } from 'opnet';
import { AbiTypeToStr, StrToAbiType } from './StrToAbiType.js';
import { Logger } from '@btc-vision/logger';
import { EventAbi } from './interfaces/Abi.js';
import { unquote } from './utils/index.js';
import { ABICoder } from '@btc-vision/transaction';
import { jsonrepair } from 'jsonrepair';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * A single parameter definition. It can be a bare string (e.g. "uint256")
 * or an object-literal (named parameter).
 */
type ParamDefinition = string | NamedParameter;

/**
 * Example "NamedParameter":
 *   { name: "amount", type: "uint256" }
 */
interface NamedParameter {
    name: string;
    type: string;
}

/**
 * Tracks each method's metadata so we can build the ABI.
 */
interface MethodCollection {
    methodName: string;
    paramDefs: ParamDefinition[];
    /**
     * The newly added set of return definitions from @returns(...)
     */
    returnDefs: ParamDefinition[];
    signature?: string;
    declaration: MethodDeclaration;
    selector?: number;
    internalName?: string;
}

// ------------------------------------------------------------------
// Transformer
// ------------------------------------------------------------------
const logger = new Logger();
logger.setLogPrefix('OPNetTransformer');
logger.info('Compiling smart contract...');

const abiCoder = new ABICoder();

export default class MyTransform extends Transform {
    private methodsByClass: Map<string, MethodCollection[]> = new Map();
    private classDeclarations: Map<string, ClassDeclaration> = new Map();

    private events: EventAbi[] = [];
    private program: Program | undefined;

    private currentClassName: string | null = null;
    private collectingEvent: boolean = false;
    private currentEventName: string | null = null;

    // ------------------------------------------------------------
    // Lifecycle Hooks
    // ------------------------------------------------------------
    afterParse(parser: Parser): void {
        // Walk each source
        for (const source of parser.sources) {
            if (source.isLibrary || source.internalPath.startsWith('~lib/')) {
                continue;
            }
            for (const stmt of source.statements) {
                this.visitStatement(stmt);
            }
        }

        // Build ABI JSON
        const abiJson = JSON.stringify(this.buildAbi(), null, 4);
        fs.writeFileSync('abi.json', abiJson);
        logger.success('ABI generated to abi.json!');

        // Inject or overwrite `execute` where needed
        for (const [className, methods] of this.methodsByClass.entries()) {
            if (!methods.length) continue;

            logger.info(`Injecting 'execute' in class ${className}...`);
            const classDecl = this.classDeclarations.get(className);
            if (!classDecl) {
                logger.warn(`ClassDeclaration not found for ${className}`);
                continue;
            }

            // Build and parse the new method
            const methodText = this.buildExecuteMethod(className, methods);
            const newMember = SimpleParser.parseClassMember(methodText, classDecl);

            // Overwrite if exists
            const existingIndex = classDecl.members.findIndex((member) => {
                return (
                    member.kind === NodeKind.MethodDeclaration &&
                    (member as MethodDeclaration).name.text === 'execute'
                );
            });

            if (existingIndex !== -1) {
                logger.info(`Overwriting existing 'execute' in class ${className}`);
                classDecl.members[existingIndex] = newMember;
            } else {
                classDecl.members.push(newMember);
            }
        }
    }

    afterInitialize(program: Program): void {
        super.afterInitialize?.(program);
        this.program = program;

        // Resolve internalName for each method
        for (const [className, methods] of this.methodsByClass.entries()) {
            for (const methodInfo of methods) {
                const resolvedName = this.getInternalNameForMethodDeclaration(
                    methodInfo.declaration,
                );

                if (resolvedName) {
                    methodInfo.internalName = resolvedName;
                } else {
                    throw new Error(
                        `Method ${className}.${methodInfo.methodName} not found in the program.`,
                    );
                }
            }
        }
    }

    // ------------------------------------------------------------
    // Build the `execute` method stubs
    // ------------------------------------------------------------
    private buildExecuteMethod(_className: string, methods: MethodCollection[]): string {
        let bodyLines: string[] = [];

        for (const m of methods) {
            // Build the signature from paramDefs
            const realNames = m.paramDefs.map((param) => {
                if (typeof param === 'string') {
                    return param;
                }

                // If it's NamedParameter, param.type might be "ABIDataTypes.XYZ" or a simple string
                const type = param.type;
                if (type.startsWith('ABIDataTypes.')) {
                    const enumType = type.replace('ABIDataTypes.', '');
                    const enumValue = ABIDataTypes[enumType as keyof typeof ABIDataTypes];

                    if (!enumValue) {
                        throw new Error(`Invalid abi type (from string): ${enumType}`);
                    }
                    const selectorValue = AbiTypeToStr[enumValue];
                    if (!selectorValue) {
                        throw new Error(`Invalid abi type (to string): ${enumValue}`);
                    }
                    return selectorValue;
                }
                return type;
            });

            const sig = `${m.methodName}(${realNames.join(',')})`;
            m.signature = sig;

            // 4-byte selector
            const selectorHex = abiCoder.encodeSelector(sig);
            const selectorNum = `0x${selectorHex}`;

            logger.debugBright(`Found function ${sig} -> ${selectorNum}`);

            bodyLines.push(
                `if (selector == ${selectorNum}) return this.${m.methodName}(calldata);`,
            );
        }

        // Fallback
        bodyLines.push('return super.execute(selector, calldata);');

        return `
      // auto-injected by transform
      public override execute(selector: u32, calldata: Calldata): BytesWriter {
        ${bodyLines.join('\n        ')}
      }`;
    }

    private getInternalNameForMethodDeclaration(methodDecl: MethodDeclaration): string | null {
        if (!this.program) return null;
        const element = this.program.getElementByDeclaration(methodDecl);
        if (!element) return null;

        if (element.kind === ElementKind.FunctionPrototype) {
            return (element as FunctionPrototype).internalName;
        } else if (element.kind === ElementKind.Function) {
            return element.internalName;
        }
        return null;
    }

    // ------------------------------------------------------------
    // Build final ABI
    // ------------------------------------------------------------
    private buildAbi(): unknown {
        const functions: unknown[] = [];

        // Build function ABI from method definitions
        for (const [_, methods] of this.methodsByClass) {
            for (const m of methods) {
                // inputs
                const inputs = m.paramDefs.map((p, idx) => {
                    if (typeof p === 'string') {
                        return {
                            name: `param${idx + 1}`,
                            type: this.mapToAbiDataType(p),
                        };
                    } else {
                        return {
                            name: p.name,
                            type: this.mapToAbiDataType(p.type),
                        };
                    }
                });

                // outputs (use returnDefs if provided, else fallback)
                let outputs: { name: string; type: ABIDataTypes }[];
                if (m.returnDefs.length > 0) {
                    outputs = m.returnDefs.map((p, idx) => {
                        if (typeof p === 'string') {
                            return {
                                name: `returnVal${idx + 1}`,
                                type: this.mapToAbiDataType(p),
                            };
                        } else {
                            return {
                                name: p.name,
                                type: this.mapToAbiDataType(p.type),
                            };
                        }
                    });
                } else {
                    outputs = [];
                }

                functions.push({
                    name: m.methodName,
                    type: 'Function',
                    inputs,
                    outputs,
                });
            }
        }

        // Build event ABI
        const events = this.events.map((e) => ({
            name: e.eventName,
            values: e.params.map((p) => ({
                name: p.name,
                type: p.type,
            })),
            type: 'Event',
        }));

        return { functions, events };
    }

    // ------------------------------------------------------------
    // AST Traversal
    // ------------------------------------------------------------
    private visitStatement(stmt: Statement): void {
        switch (stmt.kind) {
            case NodeKind.ClassDeclaration:
                this.visitClassDeclaration(stmt as ClassDeclaration);
                break;
            case NodeKind.MethodDeclaration:
                this.visitMethodDeclaration(stmt as MethodDeclaration);
                break;
            case NodeKind.FieldDeclaration:
                this.visitFieldDeclaration(stmt as FieldDeclaration);
                break;
            default:
                // no-op
                break;
        }
    }

    private visitClassDeclaration(node: ClassDeclaration): void {
        this.currentClassName = node.name.text;
        this.classDeclarations.set(node.name.text, node);

        // check if it's an @event class => parse fields as event
        let isEventClass = false;
        let possibleEventName: string | null = null;

        if (node.decorators) {
            for (const dec of node.decorators) {
                if (dec.name.kind === NodeKind.Identifier) {
                    const decName = (dec.name as IdentifierExpression).text;
                    if (decName === 'event') {
                        isEventClass = true;
                        if (dec.args && dec.args.length > 0) {
                            possibleEventName = unquote(dec.args[0].range.toString());
                        }
                    }
                }
            }
        }
        if (isEventClass) {
            this.collectingEvent = true;
            this.currentEventName = possibleEventName || node.name.text;
        }

        // visit members
        for (const member of node.members) {
            this.visitStatement(member);
        }

        // reset event-collecting state
        if (isEventClass) {
            this.collectingEvent = false;
            this.currentEventName = null;
        }
        this.currentClassName = null;
    }

    private visitMethodDeclaration(node: MethodDeclaration): void {
        if (!this.currentClassName) return;
        if (!node.decorators) return;

        // We will combine info from @method(...) and @returns(...)
        let methodInfo: MethodCollection | null = null;

        for (const dec of node.decorators) {
            if (dec.name.kind !== NodeKind.Identifier) continue;
            const decName = (dec.name as IdentifierExpression).text;

            if (decName === 'method') {
                // Gather raw strings from the decorator arguments
                const rawArgs: string[] = [];
                if (dec.args && dec.args.length > 0) {
                    for (const arg of dec.args) {
                        rawArgs.push(unquote(arg.range.toString()));
                    }
                }

                const { methodName, paramDefs } = this.parseDecoratorArgs(rawArgs, node.name.text);

                // Create the methodInfo if not existing
                if (!methodInfo) {
                    methodInfo = {
                        methodName,
                        paramDefs,
                        returnDefs: [],
                        declaration: node,
                    };
                } else {
                    // If methodInfo was already created by a @returns decorator,
                    // just update the methodName & paramDefs
                    methodInfo.methodName = methodName;
                    methodInfo.paramDefs = paramDefs;
                }
            } else if (decName === 'returns') {
                // Parse return definitions
                const rawArgs: string[] = [];
                if (dec.args && dec.args.length > 0) {
                    for (const arg of dec.args) {
                        rawArgs.push(unquote(arg.range.toString()));
                    }
                }
                const returnDefs = this.parseParamDefs(rawArgs);

                if (!methodInfo) {
                    // Possibly a method has only @returns, no @method
                    // We'll use the method's actual name as fallback
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs,
                        declaration: node,
                    };
                } else {
                    methodInfo.returnDefs = returnDefs;
                }
            }
        }

        // If we got either @method or @returns, store the method info
        if (methodInfo) {
            let arr = this.methodsByClass.get(this.currentClassName);
            if (!arr) {
                arr = [];
                this.methodsByClass.set(this.currentClassName, arr);
            }
            // If this method is encountered again with a second decorator,
            // we want to merge rather than push a second entry.
            // The simplest approach: check if the same declaration is already in the array.
            const existing = arr.find((m) => m.declaration === node);
            if (existing) {
                // Overwrite existing one with updated info (methodName, paramDefs, returnDefs).
                existing.methodName = methodInfo.methodName;
                existing.paramDefs = methodInfo.paramDefs;
                existing.returnDefs = methodInfo.returnDefs;
            } else {
                arr.push(methodInfo);
            }
        }
    }

    private visitFieldDeclaration(node: FieldDeclaration): void {
        // For an @event class, every field is part of the event ABI
        if (!this.collectingEvent || !this.currentEventName) return;
        const fieldName = node.name.text;

        // We do not proceed if the field has no type:
        if (!node.type) return;
        const typeStr = node.type.range.toString();

        this.events.push({
            eventName: this.currentEventName,
            params: [
                {
                    name: fieldName,
                    type: this.mapToAbiDataType(typeStr),
                },
            ],
        });
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    /**
     * Takes raw arguments from a @method(...) decorator and differentiates
     * between [methodName, ...params] vs. [param1, param2, ...].
     */
    private parseDecoratorArgs(
        rawArgs: string[],
        defaultMethodName: string,
    ): { methodName: string; paramDefs: ParamDefinition[] } {
        const parsedItems = rawArgs.map((arg) => this.parseParamDefinition(arg));

        if (parsedItems.length === 0) {
            // no arguments => no override name, no parameters
            return {
                methodName: defaultMethodName,
                paramDefs: [],
            };
        }

        const firstItem = parsedItems[0];

        // If recognized as a param => methodName is the default,
        // else the first item is actually the methodName
        if (this.isParamDefinition(firstItem)) {
            return {
                methodName: defaultMethodName,
                paramDefs: parsedItems,
            };
        } else {
            // The first item is the method name => everything else is parameters
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            const methodName = String(firstItem);
            const paramDefs = parsedItems.slice(1);
            return { methodName, paramDefs };
        }
    }

    /**
     * For @returns(...), we do not treat the first item as a method name
     * so we parse everything as param definitions.
     */
    private parseParamDefs(rawArgs: string[]): ParamDefinition[] {
        return rawArgs.map((arg) => this.parseParamDefinition(arg));
    }

    /**
     * Attempt to parse a single string argument into a named param, or fallback to raw string.
     *
     *  - If it looks like an object-literal (JSON) with { name, type }, parse as NamedParameter
     *  - Otherwise treat as a simple type string (e.g. "uint256")
     */
    private parseParamDefinition(raw: string): ParamDefinition {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(jsonrepair(trimmed));
                if (typeof parsed.name === 'string' && typeof parsed.type === 'string') {
                    return { name: parsed.name, type: parsed.type };
                }
            } catch (e) {
                // ignore parse errors and fallback
            }
        }
        return trimmed;
    }

    /**
     * Checks if we recognize a piece of data as a valid param type.
     */
    private isParamDefinition(param: ParamDefinition): boolean {
        if (typeof param === 'string') {
            return param in StrToAbiType || param.startsWith('ABIDataTypes.');
        } else {
            if (param.type.startsWith('ABIDataTypes.')) {
                return true;
            }
            return param.type in StrToAbiType;
        }
    }

    /**
     * Convert a user-supplied type string into our internal ABIDataTypes enum.
     */
    private mapToAbiDataType(str: string): ABIDataTypes {
        if (str.startsWith('ABIDataTypes.')) {
            // "ABIDataTypes.UINT256" => "UINT256"
            const enumName = str.replace('ABIDataTypes.', '');
            return enumName as ABIDataTypes;
        }

        // else check our known mapping
        return StrToAbiType[str];
    }
}
