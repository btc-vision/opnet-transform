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

interface MethodCollection {
    methodName: string;
    paramDefs: ParamDefinition[];
    signature?: string;
    declaration: MethodDeclaration;
    selector?: number;
    internalName?: string;
}

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

    afterParse(parser: Parser): void {
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

    private buildExecuteMethod(_className: string, methods: MethodCollection[]): string {
        let bodyLines: string[] = [];

        for (const m of methods) {
            // Build the signature from paramDefs
            const realNames = m.paramDefs.map((param) => {
                if (typeof param === 'string') {
                    return param;
                }

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

                return param.type;
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

    private buildAbi(): unknown {
        const functions: unknown[] = [];
        for (const [_, methods] of this.methodsByClass) {
            for (const m of methods) {
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
                const outputs = [{ name: 'success', type: ABIDataTypes.BOOL }];
                functions.push({
                    name: m.methodName,
                    type: 'Function',
                    inputs,
                    outputs,
                });
            }
        }
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

    private mapToAbiDataType(str: string): ABIDataTypes {
        if (str.startsWith('ABIDataTypes')) {
            return str.replace('ABIDataTypes.', '') as ABIDataTypes;
        }

        return StrToAbiType[str];
    }

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

        if (isEventClass) {
            this.collectingEvent = false;
            this.currentEventName = null;
        }
        this.currentClassName = null;
    }

    /**
     * Parse @method(...) arguments, which can be:
     *  - methodName, param, param, ...
     *  - param, param, param...
     * where each param can be a bare type string ("uint256", "address[]")
     * or an object-literal string: "{ name: 'xyz', type: 'address[]' }"
     */
    private visitMethodDeclaration(node: MethodDeclaration): void {
        if (!this.currentClassName) return;
        if (node.decorators) {
            for (const dec of node.decorators) {
                if (dec.name.kind === NodeKind.Identifier) {
                    const decName = (dec.name as IdentifierExpression).text;
                    if (decName === 'method') {
                        // Gather raw strings from the decorator arguments
                        const rawArgs: string[] = [];
                        if (dec.args && dec.args.length > 0) {
                            for (const arg of dec.args) {
                                rawArgs.push(unquote(arg.range.toString()));
                            }
                        }

                        // Parse them
                        const { methodName, paramDefs } = this.parseDecoratorArgs(
                            rawArgs,
                            node.name.text,
                        );

                        let arr = this.methodsByClass.get(this.currentClassName);
                        if (!arr) {
                            arr = [];
                            this.methodsByClass.set(this.currentClassName, arr);
                        }
                        arr.push({
                            methodName,
                            paramDefs,
                            declaration: node,
                        });
                    }
                }
            }
        }
    }

    private visitFieldDeclaration(node: FieldDeclaration): void {
        if (!this.collectingEvent || !this.currentEventName) return;
        const fieldName = node.name.text;

        if (!node.type) return;
        const typeStr = node.type.range.toString();
        this.events.push({
            eventName: this.currentEventName,
            params: [{ name: fieldName, type: this.mapToAbiDataType(typeStr) }],
        });
    }

    private parseDecoratorArgs(
        rawArgs: string[],
        defaultMethodName: string,
    ): {
        methodName: string;
        paramDefs: ParamDefinition[];
    } {
        // 1) parse each item into either NamedParameter or string
        const parsedItems = rawArgs.map((arg) => this.parseParamDefinition(arg));

        // 2) If the first item is recognized as a "parameter" (like "uint256" or { name: "xyz", type: "address" }), use the defaultMethodName.
        // Otherwise, treat the first item as the methodName.
        if (parsedItems.length === 0) {
            // no arguments => no override name, no parameters
            return {
                methodName: defaultMethodName,
                paramDefs: [],
            };
        }

        const firstItem = parsedItems[0];

        // If recognized as param => methodName is the default,
        // else methodName is the first item
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
     * Parse a single raw argument string into either a NamedParameter or a string param.
     *
     *  - If it looks like JSON and has { "name": x, "type": y }, we interpret it as NamedParameter
     *  - else it's a bare string
     */
    private parseParamDefinition(raw: string): ParamDefinition {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(jsonrepair(trimmed));

                if (typeof parsed.name === 'string' && typeof parsed.type === 'string') {
                    return {
                        name: parsed.name,
                        type: parsed.type,
                    };
                }
            } catch (e) {
                // fallback below
            }
        }
        return trimmed;
    }

    /**
     * Checks if a param is recognized as an ABI param definition.
     * - If it's a string, it must exist in StrToAbiType. e.g. "uint256", "address"
     * - If it's a named param, its .type must be in StrToAbiType
     */
    private isParamDefinition(param: ParamDefinition): boolean {
        if (typeof param === 'string') {
            return param in StrToAbiType;
        } else {
            if (param.type.startsWith('ABIDataTypes')) {
                return true;
            }

            // named param => check if param.type is recognized
            return param.type in StrToAbiType;
        }
    }
}
