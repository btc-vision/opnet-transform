import { Transform } from '@btc-vision/assemblyscript/transform';
import {
    ClassDeclaration,
    FieldDeclaration,
    MethodDeclaration,
    NodeKind,
    Parser,
    Program,
    Statement,
} from '@btc-vision/assemblyscript/dist/assemblyscript.js';
import { fs } from '@btc-vision/assemblyscript/util/node.js';
// @ts-ignore
import { SimpleParser } from '@btc-vision/visitor-as';
import {
    BlockStatement,
    CallExpression,
    ExpressionStatement,
    IdentifierExpression,
    NamespaceDeclaration,
} from 'types:assemblyscript/src/ast';
import { ElementKind, FunctionPrototype } from 'types:assemblyscript/src/program';

import * as prettier from 'prettier';
import { ABIDataTypes } from '@btc-vision/transaction';
import { AbiTypeToStr } from './StrToAbiType.js';
import { StrToAbiType } from './StrToAbiType.js';
import { Logger } from '@btc-vision/logger';
import { unquote } from './utils/index.js';
import { ABICoder } from '@btc-vision/transaction';
import { jsonrepair } from 'jsonrepair';
import {
    ClassABI,
    DeclaredEvent,
    MethodCollection,
    ParamDefinition,
} from './interfaces/Abi.js';
import { mapAbiTypeToTypescript } from './utils/typeMappings.js';
import { isParamDefinition } from './utils/paramValidation.js';
import {
    abiTypeToSelectorString,
    canonicalizeTupleString,
    isTupleString,
    isTupleArrayType,
    parseTupleToStructuredArray,
    resolveTupleToAbiType,
    validateTupleInnerTypes,
} from './utils/tupleParser.js';
import { AbiType, StructType } from './interfaces/Abi.js';

// ------------------------------------------------------------------
// Transform
// ------------------------------------------------------------------
const logger = new Logger();
logger.setLogPrefix('OPNetTransform');
logger.info('Compiling smart contract...');

const abiCoder = new ABICoder();

export { logger, SimpleParser };

export function isAssemblyScriptStdLib(internalPath: string): boolean {
    if (!internalPath.startsWith('~lib/')) return false;
    if (internalPath.includes('@')) return false;
    return !internalPath.includes('node_modules');
}

export default class OPNetTransform extends Transform {
    // --------------------------------------------------
    // Per-class method info
    // --------------------------------------------------
    protected methodsByClass: Map<string, MethodCollection[]> = new Map();
    protected classDeclarations: Map<string, ClassDeclaration> = new Map();

    // --------------------------------------------------
    // Global event declarations (key = eventName)
    // --------------------------------------------------
    private allEvents: Map<string, DeclaredEvent> = new Map();

    // --------------------------------------------------
    // Track usage: className -> set of eventNames used
    // --------------------------------------------------
    private eventsUsedInClass: Map<string, Set<string>> = new Map();

    private program: Program | undefined;

    // Scratch state for the visitor
    private currentClassName: string | null = null;
    private collectingEvent: boolean = false; // are we in an event class?
    private currentEventName: string | null = null;
    private isEventClass: boolean = false;

    // ------------------------------------------------------------
    // Lifecycle Hooks
    // ------------------------------------------------------------
    public async afterParse(parser: Parser): Promise<void> {
        // Parse AST
        for (const source of parser.sources) {
            if (isAssemblyScriptStdLib(source.internalPath)) {
                continue;
            }

            for (const stmt of source.statements) {
                this.visitStatement(stmt);
            }
        }

        // Build ABI per class
        const abiMap = this.buildAbiPerClass();

        // Create an output folder named "abis"
        fs.mkdirSync('abis', { recursive: true });

        const prettierOptions = {
            parser: 'typescript' as const,
            printWidth: 120,
            trailingComma: 'all' as const,
            tabWidth: 4,
            semi: true,
            singleQuote: true,
            quoteProps: 'as-needed' as const,
            bracketSpacing: true,
            bracketSameLine: true,
            arrowParens: 'always' as const,
            singleAttributePerLine: true,
        };

        // Write one JSON + TS + .d.ts per class
        for (const [className, abiObj] of abiMap.entries()) {
            if (abiObj.functions.length === 0) continue;

            // JSON
            const filePath = `abis/${className}.abi.json`;
            fs.writeFileSync(filePath, JSON.stringify(abiObj, null, 4));
            logger.success(`ABI generated to ${filePath}`);

            // TypeScript ABI file
            const abiTsPath = `abis/${className}.abi.ts`;
            const abiTsContents = this.buildAbiTsFile(className, abiObj);
            const formattedAbiTs = await prettier.format(abiTsContents, prettierOptions);
            fs.writeFileSync(abiTsPath, formattedAbiTs);
            logger.success(`ABI generated to ${abiTsPath}`);

            // DTS
            const dtsPath = `abis/${className}.d.ts`;
            const dtsContents = this.buildDtsForClass(className, abiObj);
            const formattedDts = await prettier.format(dtsContents, prettierOptions);

            fs.writeFileSync(dtsPath, formattedDts);
            logger.success(`Type definitions generated to ${dtsPath}`);
        }

        // Inject/overwrite `execute` in each relevant class
        for (const [className, methods] of this.methodsByClass.entries()) {
            if (!methods.length) continue;

            logger.info(`Injecting 'execute' in class ${className}...`);
            const classDecl = this.classDeclarations.get(className);
            if (!classDecl) {
                logger.warn(`ClassDeclaration not found for ${className}`);
                continue;
            }

            const methodText = this.buildExecuteMethod(className, methods);
            const newMember = SimpleParser.parseClassMember(methodText, classDecl);

            // Overwrite if it exists
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

        // Check for "unused" events and log warnings
        this.checkUnusedEvents();
    }

    afterInitialize(program: Program): void {
        super.afterInitialize?.(program);
        this.program = program;

        // We fill in "internalName" for each method
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
    //  Build final ABI per class
    // ------------------------------------------------------------
    protected buildAbiPerClass(): Map<string, ClassABI> {
        const result = new Map<string, ClassABI>();

        // For each known class, gather the methods
        for (const [className, methods] of this.methodsByClass.entries()) {
            // 1) Build "functions"
            const functions = methods.map((m) => {
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

                // outputs
                let outputs: { name: string; type: AbiType }[] = [];
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
                }

                return {
                    name: m.methodName,
                    type: (m.isView ? 'View' : 'Function') as 'Function' | 'View',
                    payable: m.isPayable ?? false,
                    onlyOwner: m.onlyOwner ?? false,
                    inputs,
                    outputs,
                };
            });

            // 2) Gather which events this class used
            const usedEventNames = this.eventsUsedInClass.get(className) || new Set();

            // 3) Convert them to ABI
            const events = Array.from(usedEventNames)
                .map((evName) => {
                    const declared = this.allEvents.get(evName);
                    if (!declared) {
                        // if user referenced an event that doesn't exist, we warn in checkUnusedEvents,
                        // but let's skip adding a null event.
                        return null;
                    }
                    return {
                        name: declared.eventName,
                        values: declared.params.map((p) => ({
                            name: p.name,
                            type: p.type,
                        })),
                        type: 'Event' as const,
                    };
                })
                .filter((x) => x !== null) as ClassABI['events']; // remove null placeholders

            // 4) Build final
            result.set(className, { functions, events });
        }

        return result;
    }

    // ------------------------------------------------------------
    //  Generate .d.ts for each class
    // ------------------------------------------------------------
    protected buildDtsForClass(className: string, abiObj: ClassABI): string {
        const interfaceName = `I${className}`;

        // 1) Event type definitions
        const eventTypeDefs: string[] = [];
        for (const evt of abiObj.events) {
            const fields = evt.values
                .map((v) => {
                    const tsType = this.mapAbiTypeToTypescript(v.type);
                    return `  readonly ${v.name}: ${tsType};`;
                })
                .join('\n');

            const eventName = `${evt.name}Event`;
            eventTypeDefs.push(`export type ${eventName} = {\n${fields}\n};`);
        }

        // 2) Specialized call-result types
        const methodsInClass = this.methodsByClass.get(className) || [];
        const callResultTypes: string[] = [];

        for (const fn of abiObj.functions) {
            const originalMethod = methodsInClass.find((m) => m.methodName === fn.name);
            const hasOutputs = fn.outputs.length > 0;
            const hasEmittedEvents = originalMethod && originalMethod.emittedEvents.length > 0;

            const typeName = this.toPascalCase(fn.name);

            // build the "outputs" object-literal
            let outputLines: string[] = [];
            if (hasOutputs) {
                for (const o of fn.outputs) {
                    const tsType = this.mapAbiTypeToTypescript(o.type);
                    outputLines.push(`  ${o.name}: ${tsType};`);
                }
            }
            const outputObj = outputLines.length ? `{\n${outputLines.join('\n')}\n}` : '{}';

            // build the union of events
            let eventUnion = 'never';
            if (hasEmittedEvents && originalMethod) {
                // e.g. "FooEvent | BarEvent"
                eventUnion = originalMethod.emittedEvents
                    .map((eName) => `${eName}Event`)
                    .join(' | ');
            }

            // e.g. OPNetEvent<FooEvent | BarEvent>[]
            const eventsParam = `OPNetEvent<${eventUnion}>[]`;

            const docBlock = `
/**
 * @description Represents the result of the ${fn.name} function call.
 */
`.trim();

            callResultTypes.push(`
${docBlock}
export type ${typeName} = CallResult<
  ${outputObj},
  ${eventsParam}
>;
`);
        }

        // 3) Extract named tuple types from inputs/outputs
        // Maps "MethodNameParamName" -> inner tuple TS type (without trailing [])
        const tupleTypeDefs: string[] = [];
        // Maps param key "fnName:paramName" -> exported type name
        const tupleTypeNames = new Map<string, string>();

        for (const fn of abiObj.functions) {
            const allParams = [
                ...fn.inputs.map((p) => ({ ...p, kind: 'input' as const })),
                ...fn.outputs.map((p) => ({ ...p, kind: 'output' as const })),
            ];
            for (const p of allParams) {
                // Only generate named tuple types for multi-element tuples.
                // Single-element tuples unwrap to Type[] via mapAbiTypeToTypescript.
                if (isTupleArrayType(p.type) && p.type.length > 1) {
                    const methodPascal = this.toPascalCase(fn.name);
                    const paramPascal = this.toPascalCase(p.name);
                    const typeName = `${methodPascal}${paramPascal}`;
                    const innerTypes = p.type.map((t) => this.mapAbiTypeToTypescript(t));
                    tupleTypeDefs.push(`export type ${typeName} = [${innerTypes.join(', ')}];`);
                    tupleTypeNames.set(`${fn.name}:${p.name}`, typeName);
                }
            }
        }

        // 4) The interface
        const interfaceLines: string[] = [
            `export interface ${interfaceName} extends IOP_NETContract {`,
        ];

        for (const fn of abiObj.functions) {
            // param list
            const paramList = fn.inputs
                .map((p) => {
                    const namedType = tupleTypeNames.get(`${fn.name}:${p.name}`);
                    if (namedType) {
                        return `${p.name}: ${namedType}[]`;
                    }
                    const tsType = this.mapAbiTypeToTypescript(p.type);
                    return `${p.name}: ${tsType}`;
                })
                .join(', ');

            const callResultName = this.toPascalCase(fn.name);
            interfaceLines.push(`  ${fn.name}(${paramList}): Promise<${callResultName}>;`);
        }
        interfaceLines.push('}');

        // combine
        const sections: string[][] = [
            [
                `import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';`,
                `import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';`,
            ],
            [
                '// ------------------------------------------------------------------',
                '// Event Definitions',
                '// ------------------------------------------------------------------',
                ...eventTypeDefs,
            ],
            [
                '// ------------------------------------------------------------------',
                '// Call Results',
                '// ------------------------------------------------------------------',
                ...callResultTypes,
            ],
        ];

        if (tupleTypeDefs.length > 0) {
            sections.push([
                '// ------------------------------------------------------------------',
                '// Tuple Types',
                '// ------------------------------------------------------------------',
                ...tupleTypeDefs,
            ]);
        }

        sections.push([
            '// ------------------------------------------------------------------',
            `// ${interfaceName}`,
            '// ------------------------------------------------------------------',
            ...interfaceLines,
        ]);

        return sections.map((s) => s.join('\n')).join('\n\n') + '\n';
    }

    // ------------------------------------------------------------
    //  Generate TypeScript ABI file (using opnet library types)
    // ------------------------------------------------------------
    protected buildAbiTsFile(className: string, abiObj: ClassABI): string {
        const lines: string[] = [];

        const formatTypeRef = (type: AbiType): string => {
            // Structured tuple array: [ABIDataTypes.X, ABIDataTypes.Y]
            if (isTupleArrayType(type)) {
                const elements = type.map((t) => `ABIDataTypes.${t}`);
                return `[${elements.join(', ')}]`;
            }
            // Structured object (struct): { field: ABIDataTypes.X }
            if (typeof type === 'object' && !Array.isArray(type)) {
                const entries = Object.entries(type as StructType)
                    .map(([key, val]) => `${key}: ABIDataTypes.${val}`)
                    .join(', ');
                return `{ ${entries} }`;
            }
            // Known ABIDataTypes enum value
            if (AbiTypeToStr[type as ABIDataTypes] !== undefined) {
                return `ABIDataTypes.${type}`;
            }
            // Fallback
            return `ABIDataTypes.${type}`;
        };

        // Imports
        lines.push(
            `import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';`,
        );
        lines.push('');

        // Events array
        const eventsVarName = `${className}Events`;
        lines.push(`export const ${eventsVarName} = [`);
        for (const evt of abiObj.events) {
            const valuesStr = evt.values
                .map((v) => `{ name: '${v.name}', type: ${formatTypeRef(v.type)} }`)
                .join(', ');
            lines.push(`    {`);
            lines.push(`        name: '${evt.name}',`);
            lines.push(`        values: [${valuesStr}],`);
            lines.push(`        type: BitcoinAbiTypes.Event,`);
            lines.push(`    },`);
        }
        lines.push(`];`);
        lines.push('');

        // ABI array
        const abiVarName = `${className}Abi`;
        lines.push(`export const ${abiVarName} = [`);
        for (const fn of abiObj.functions) {
            // Build inputs
            const inputsStr =
                fn.inputs.length === 0
                    ? '[]'
                    : `[${fn.inputs.map((i) => `{ name: '${i.name}', type: ${formatTypeRef(i.type)} }`).join(', ')}]`;

            // Build outputs
            const outputsStr =
                fn.outputs.length === 0
                    ? '[]'
                    : `[${fn.outputs.map((o) => `{ name: '${o.name}', type: ${formatTypeRef(o.type)} }`).join(', ')}]`;

            lines.push(`    {`);
            lines.push(`        name: '${fn.name}',`);

            // Map view/payable to opnet's FunctionBaseData format
            if (fn.type === 'View') {
                lines.push(`        constant: true,`);
            }
            if (fn.payable) {
                lines.push(`        payable: true,`);
            }

            lines.push(`        inputs: ${inputsStr},`);
            lines.push(`        outputs: ${outputsStr},`);
            lines.push(`        type: BitcoinAbiTypes.Function,`);
            lines.push(`    },`);
        }

        // Spread events and OP_NET_ABI
        lines.push(`    ...${eventsVarName},`);
        lines.push(`    ...OP_NET_ABI,`);
        lines.push(`];`);
        lines.push('');

        // Default export
        lines.push(`export default ${abiVarName};`);
        lines.push('');

        return lines.join('\n');
    }

    // ------------------------------------------------------------
    //  Build the `execute` method stubs
    // ------------------------------------------------------------
    protected buildExecuteMethod(_className: string, methods: MethodCollection[]): string {
        const bodyLines: string[] = [];

        for (const m of methods) {
            // Build the method signature from paramDefs.
            // Normalize ALL params through mapToAbiDataType -> AbiTypeToStr
            // so aliases like "AddressMap<u256>" become "tuple(address,uint256)[]".
            const realNames = m.paramDefs.map((param) => {
                const type = typeof param === 'string' ? param : param.type;
                const abiType = this.mapToAbiDataType(type);
                return abiTypeToSelectorString(abiType);
            });

            const sig = `${m.methodName}(${realNames.join(',')})`;
            m.signature = sig;

            // 4-byte selector: use override if provided, otherwise compute
            let selectorNum: string;
            if (m.selectorOverride) {
                selectorNum = m.selectorOverride;
                logger.debugBright(
                    `Found function ${sig} -> ${selectorNum} [override] (${m.declaration.name.text})`,
                );
            } else {
                const selectorHex = abiCoder.encodeSelector(sig);
                selectorNum = `0x${selectorHex}`;
                logger.debugBright(
                    `Found function ${sig} -> ${selectorNum} (${m.declaration.name.text})`,
                );
            }

            // Build the body for this selector branch
            const callLine = `return this.${m.declaration.name.text}(calldata);`;
            if (m.onlyOwner) {
                bodyLines.push(
                    `if (selector == ${selectorNum}) { this.onlyOwner(calldata); ${callLine} }`,
                );
            } else {
                bodyLines.push(`if (selector == ${selectorNum}) ${callLine}`);
            }
        }

        bodyLines.push('return super.execute(selector, calldata);');

        return `
      // auto-injected by transform
      public override execute(selector: u32, calldata: Calldata): BytesWriter {
        ${bodyLines.join('\n        ')}
      }`;
    }

    protected checkUnusedEvents(): void {
        /**
         * For each declared event:
         *   - see if it's used in ANY class (based on eventsUsedInClass)
         *   - if not used, warn
         */
        const usedEvents = new Set<string>();
        for (const [, usedSet] of this.eventsUsedInClass.entries()) {
            for (const evName of usedSet) {
                usedEvents.add(evName);
                // If it doesn't exist in allEvents, warn
                if (!this.allEvents.has(evName)) {
                    logger.warn(
                        `Method references event '${evName}' which is not declared anywhere.`,
                    );
                }
            }
        }

        // check for unused
        for (const evName of this.allEvents.keys()) {
            if (!usedEvents.has(evName)) {
                logger.warn(
                    `Event '${evName}' was declared but never used (no @emit referencing it).`,
                );
            }
        }
    }

    // ------------------------------------------------------------
    //  AST Visitor
    // ------------------------------------------------------------
    protected visitStatement(stmt: Statement): void {
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
            case NodeKind.NamespaceDeclaration: {
                const ns = stmt as NamespaceDeclaration;
                for (const inner of ns.members) {
                    this.visitStatement(inner);
                }
                break;
            }

            default:
                // no-op
                break;
        }
    }

    private visitClassDeclaration(node: ClassDeclaration): void {
        this.currentClassName = node.name.text;
        this.classDeclarations.set(node.name.text, node);

        // Set up methods array if not present
        if (!this.methodsByClass.has(node.name.text)) {
            this.methodsByClass.set(node.name.text, []);
        }

        // Also set up usage tracking
        if (!this.eventsUsedInClass.has(node.name.text)) {
            this.eventsUsedInClass.set(node.name.text, new Set());
        }

        // Check if it's an event class
        this.isEventClass = false;
        let possibleEventName: string | null = null;

        // 1) Check "extends NetEvent"
        if (node.extendsType && node.extendsType.name.identifier.text === 'NetEvent') {
            this.isEventClass = true;
            possibleEventName = node.name.text;
            logger.log(`Found event class: ${node.name.text}`);
        }

        // 2) Check @event decorator
        if (node.decorators) {
            for (const dec of node.decorators) {
                if (dec.name.kind === NodeKind.Identifier) {
                    const decName = (dec.name as IdentifierExpression).text;
                    if (decName === 'event') {
                        this.isEventClass = true;
                        if (dec.args && dec.args.length > 0) {
                            possibleEventName = unquote(dec.args[0].range.toString());
                        }
                    }
                }
            }
        }

        if (this.isEventClass) {
            this.collectingEvent = true;
            this.currentEventName = possibleEventName || node.name.text;
            // Add initial blank event to allEvents map
            if (!this.allEvents.has(this.currentEventName)) {
                this.allEvents.set(this.currentEventName, {
                    eventName: this.currentEventName,
                    params: [],
                });
            }
        }

        // Visit members
        for (const member of node.members) {
            this.visitStatement(member);
        }

        // Reset
        this.collectingEvent = false;
        this.currentEventName = null;
        this.isEventClass = false;
        this.currentClassName = null;
    }

    private visitMethodDeclaration(node: MethodDeclaration): void {
        if (!this.currentClassName) return;

        // If it's the constructor of an event class, parse it
        if (this.isEventClass && node.name.text === 'constructor' && this.currentEventName) {
            this.parseEventConstructor(node, this.currentEventName);
            // don't `return` here because it might also have decorators
        }

        if (!node.decorators) return;

        let methodInfo: MethodCollection | null = null;

        // Check each decorator
        for (const dec of node.decorators) {
            if (dec.name.kind !== NodeKind.Identifier) continue;
            const decName = (dec.name as IdentifierExpression).text;

            if (decName === 'method') {
                // Gather raw strings from @method(...) arguments
                const rawArgs: string[] = [];
                if (dec.args && dec.args.length > 0) {
                    for (const arg of dec.args) {
                        rawArgs.push(unquote(arg.range.toString()));
                    }
                }

                const { methodName, paramDefs } = this.parseDecoratorArgs(rawArgs, node.name.text);
                if (!methodInfo) {
                    methodInfo = {
                        methodName,
                        paramDefs,
                        returnDefs: [],
                        declaration: node,
                        emittedEvents: [],
                    };
                } else {
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
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs,
                        declaration: node,
                        emittedEvents: [],
                    };
                } else {
                    methodInfo.returnDefs = returnDefs;
                }
            } else if (decName === 'emit') {
                // e.g. @emit("DepositEvent", "SomeOtherEvent")
                const rawArgs: string[] = [];
                if (dec.args && dec.args.length > 0) {
                    for (const arg of dec.args) {
                        rawArgs.push(unquote(arg.range.toString()));
                    }
                }

                if (!methodInfo) {
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs: [],
                        declaration: node,
                        emittedEvents: [],
                    };
                }

                // Record usage
                const usageSet = this.eventsUsedInClass.get(this.currentClassName) as Set<string>;
                for (const evName of rawArgs) {
                    usageSet.add(evName);
                }

                methodInfo.emittedEvents.push(...rawArgs);
            } else if (decName === 'view') {
                if (!methodInfo) {
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs: [],
                        declaration: node,
                        emittedEvents: [],
                    };
                }
                methodInfo.isView = true;
            } else if (decName === 'payable') {
                if (!methodInfo) {
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs: [],
                        declaration: node,
                        emittedEvents: [],
                    };
                }
                methodInfo.isPayable = true;
            } else if (decName === 'onlyOwner') {
                if (!methodInfo) {
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs: [],
                        declaration: node,
                        emittedEvents: [],
                    };
                }
                methodInfo.onlyOwner = true;
            } else if (decName === 'selector') {
                if (!methodInfo) {
                    methodInfo = {
                        methodName: node.name.text,
                        paramDefs: [],
                        returnDefs: [],
                        declaration: node,
                        emittedEvents: [],
                    };
                }
                if (dec.args && dec.args.length > 0) {
                    methodInfo.selectorOverride = unquote(dec.args[0].range.toString());
                }
            }
        }

        if (methodInfo) {
            // @view and @payable are mutually exclusive
            if (methodInfo.isView && methodInfo.isPayable) {
                throw new Error(
                    `Compile error: method "${methodInfo.methodName}" in class "${this.currentClassName}" ` +
                        `cannot be both @view and @payable. A view method is read-only and cannot accept payment.`,
                );
            }

            const arr = this.methodsByClass.get(this.currentClassName);
            if (!arr) return;
            const existing = arr.find((m) => m.declaration === node);
            if (existing) {
                // merge
                existing.methodName = methodInfo.methodName;
                existing.paramDefs = methodInfo.paramDefs;
                existing.returnDefs = methodInfo.returnDefs;
                existing.emittedEvents = [
                    ...new Set([...existing.emittedEvents, ...methodInfo.emittedEvents]),
                ];
                if (methodInfo.isView) existing.isView = true;
                if (methodInfo.isPayable) existing.isPayable = true;
                if (methodInfo.onlyOwner) existing.onlyOwner = true;
                if (methodInfo.selectorOverride)
                    existing.selectorOverride = methodInfo.selectorOverride;

                // Check conflict after merge
                if (existing.isView && existing.isPayable) {
                    throw new Error(
                        `Compile error: method "${existing.methodName}" in class "${this.currentClassName}" ` +
                            `cannot be both @view and @payable. A view method is read-only and cannot accept payment.`,
                    );
                }
            } else {
                arr.push(methodInfo);
            }
        }
    }

    private visitFieldDeclaration(node: FieldDeclaration): void {
        // If we are collecting an event (NetEvent or @event class), treat the fields as event params
        if (!this.collectingEvent || !this.currentEventName) return;
        if (!node.type) return;

        const fieldName = node.name.text;
        const typeStr = node.type.range.toString();

        const ev = this.allEvents.get(this.currentEventName);
        if (!ev) {
            // Should not happen if we set it earlier, but guard anyway
            return;
        }

        ev.params.push({
            name: fieldName,
            type: this.mapToAbiDataType(typeStr),
        });
    }

    private parseEventConstructor(node: MethodDeclaration, eventName: string): void {
        // Look for super("Foo", ...)
        let finalName = eventName;

        const methodBody = node.body;
        if (methodBody && methodBody.kind === NodeKind.Block) {
            const block = methodBody as BlockStatement;

            for (const stmt of block.statements) {
                if (stmt.kind === NodeKind.Expression) {
                    const exprStmt = stmt as ExpressionStatement;
                    if (exprStmt.expression.kind === NodeKind.Call) {
                        const callExpr = exprStmt.expression as CallExpression;
                        if (callExpr.expression.kind === NodeKind.Super) {
                            // super("Deposit", ...)
                            if (callExpr.args && callExpr.args.length > 0) {
                                const possibleName = unquote(callExpr.args[0].range.toString());
                                if (possibleName) {
                                    finalName = possibleName;
                                }
                            }
                        }
                    }
                }
            }
        }

        // If user changed the name in super(...), update the map key
        if (finalName !== eventName) {
            // move or unify the event in allEvents
            const old = this.allEvents.get(eventName);
            if (old) {
                this.allEvents.delete(eventName);
                const existing = this.allEvents.get(finalName);
                if (existing) {
                    // merge the params if needed
                    existing.params.push(...old.params);
                } else {
                    this.allEvents.set(finalName, {
                        eventName: finalName,
                        params: old.params,
                    });
                }
            }
        }

        // Collect constructor parameters
        const ev = this.allEvents.get(finalName);
        if (!ev) return; // sanity check

        if (node.signature.parameters) {
            for (const param of node.signature.parameters) {
                const pName = param.name.text;
                const pTypeStr = param.type ? param.type.range.toString() : 'unknown';

                ev.params.push({
                    name: pName,
                    type: this.mapToAbiDataType(pTypeStr),
                });
            }
        }
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
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
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            const methodName = String(firstItem);
            const paramDefs = parsedItems.slice(1);
            return { methodName, paramDefs };
        }
    }

    private parseParamDefs(rawArgs: string[]): ParamDefinition[] {
        return rawArgs.map((arg) => this.parseParamDefinition(arg));
    }

    private parseParamDefinition(raw: string): ParamDefinition {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(jsonrepair(trimmed));
                if (typeof parsed.name === 'string' && typeof parsed.type === 'string') {
                    return { name: parsed.name, type: parsed.type };
                }
            } catch (e) {
                // ignore parse errors and fallback to string
            }
        }
        return trimmed;
    }

    private isParamDefinition(param: ParamDefinition): boolean {
        return isParamDefinition(param);
    }

    /**
     * Convert a user-supplied type string into our internal ABIDataTypes enum.
     */
    private mapToAbiDataType(str: string): AbiType {
        if (str.startsWith('ABIDataTypes.')) {
            const enumName = str.replace('ABIDataTypes.', '');
            return enumName as ABIDataTypes;
        }
        // Check our known mapping
        if (str in StrToAbiType) {
            return StrToAbiType[str];
        }
        // Try tuple resolution for unknown strings
        if (isTupleString(str)) {
            // First try known tuple types (e.g. ADDRESS_UINT256_TUPLE)
            const resolved = resolveTupleToAbiType(str);
            if (resolved !== undefined) {
                return resolved;
            }
            // Custom tuple: validate inner types and return structured array
            const invalid = validateTupleInnerTypes(str);
            if (invalid.length > 0) {
                logger.error(
                    `Custom tuple "${str}" contains invalid inner types: ${invalid.join(', ')}`,
                );
            }
            const canonical = canonicalizeTupleString(str);
            if (canonical) {
                const structured = parseTupleToStructuredArray(canonical);
                if (structured) {
                    return structured;
                }
            }
            // Fallback: try to parse raw string into structured array
            const structured = parseTupleToStructuredArray(str);
            if (structured) {
                return structured;
            }
            logger.warn(`Unrecognized tuple type: ${str}`);
            return ABIDataTypes.STRING;
        }
        logger.warn(`Unknown ABI type: "${str}", falling back to STRING`);
        return ABIDataTypes.STRING;
    }

    private mapAbiTypeToTypescript(abiType: AbiType): string {
        const result = mapAbiTypeToTypescript(abiType);
        if (result === 'unknown') {
            logger.warn(`Unknown or unhandled type definition for ${JSON.stringify(abiType)}`);
        }
        return result;
    }

    private toPascalCase(str: string): string {
        return str
            .replace(/(^\w|_\w)/g, (match) => match.replace('_', '').toUpperCase())
            .replace(/[^A-Za-z0-9]/g, '');
    }
}
