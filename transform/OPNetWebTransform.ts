import { MethodDeclaration, NodeKind, Parser } from 'assemblyscript/dist/assemblyscript.js';
import parserTypeScript from 'prettier/parser-typescript';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettier from 'prettier/standalone';
import OPNetTransform, { SimpleParser, isAssemblyScriptStdLib, logger } from './OPNetTransform.js';

export default class OpnetWebTransform extends OPNetTransform {
    private virtualFs: Map<string, string> = new Map();

    public readFile(filename: string, baseDir: string): string | null {
        return this.virtualFs.get(`${baseDir}/${filename}`) ?? null;
    }

    public writeFile(filename: string, contents: string | Uint8Array, baseDir: string): void {
        this.virtualFs.set(`${baseDir}/${filename}`, contents.toString());
        return;
    }

    public listFiles(dirname: string, baseDir: string): string[] | null {
        const files: string[] = [];

        for (const [key] of this.virtualFs.entries()) {
            if (key.startsWith(`${baseDir}/${dirname}`)) {
                files.push(key.replace(`${baseDir}/`, ''));
            }
        }

        return files.length > 0 ? files : null;
    }

    public override async afterParse(parser: Parser): Promise<void> {
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

        // 4) Write one TypeScript ABI + .d.ts per class
        for (const [className, abiObj] of abiMap.entries()) {
            if (abiObj.functions.length === 0) continue;

            // TypeScript ABI file
            const abiTsPath = `abis/${className}.abi.ts`;
            const abiTsContents = this.buildAbiTsFile(className, abiObj);
            const formattedAbiTs = await prettier.format(abiTsContents, {
                plugins: [parserTypeScript, prettierPluginEstree],
                parser: 'typescript',
                printWidth: 120,
                trailingComma: 'all',
                tabWidth: 4,
                semi: true,
                singleQuote: true,
                quoteProps: 'as-needed',
                bracketSpacing: true,
                bracketSameLine: true,
                arrowParens: 'always',
                singleAttributePerLine: true,
            });
            this.writeFile(abiTsPath, formattedAbiTs, '.');
            logger.success(`ABI generated to ${abiTsPath}`);

            // DTS
            const dtsPath = `abis/${className}.d.ts`;
            const dtsContents = this.buildDtsForClass(className, abiObj);
            const formattedDts = await prettier.format(dtsContents, {
                plugins: [parserTypeScript, prettierPluginEstree],
                parser: 'typescript',
                printWidth: 100,
                trailingComma: 'all',
                tabWidth: 4,
                semi: true,
                singleQuote: true,
                quoteProps: 'as-needed',
                bracketSpacing: true,
                bracketSameLine: true,
                arrowParens: 'always',
                singleAttributePerLine: true,
            });

            this.writeFile(dtsPath, formattedDts, '.');
            logger.success(`Type definitions generated to ${dtsPath}`);
        }

        // 5) Inject/overwrite `execute` in each relevant class
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

        // 6) Check for "unused" events and log warnings
        this.checkUnusedEvents();
    }
}
