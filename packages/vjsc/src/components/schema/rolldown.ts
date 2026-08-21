import { resolve } from 'node:path';

import type { InputOption, Plugin } from 'rolldown';
import ts from 'typescript';
import { type CreateSchemaModuleOptions, createSchemaModule } from './generate';

export interface SchemaPluginOptions extends Omit<CreateSchemaModuleOptions, 'output'> {
  /** Output entry name without its JavaScript or declaration extension. */
  readonly entry?: string | undefined;
  /** Whether to add the companion declaration as a host build entry. */
  readonly declaration?: boolean | undefined;
}

/** Create a virtual component-schema entry directly inside a bundler config. */
export function schemaPlugin(config: SchemaPluginOptions): Plugin {
  const cwd = resolve(config.cwd ?? process.cwd());
  const entry = config.entry ?? 'vjsc';
  const moduleId = `\0vjsc:schema:${entry}`;
  const sourceFileName = resolve(cwd, `${entry}.ts`);
  const declarationFileName = resolve(cwd, `${entry}.d.ts`);

  const loadSchema = () =>
    createSchemaModule({
      cwd,
      source: config.source,
      include: config.include,
      ...(config.exclude ? { exclude: config.exclude } : {}),
      output: sourceFileName,
    });

  return {
    name: 'vjsc:schema',
    options(options) {
      return {
        ...options,
        input: addEntries(options.input, {
          [entry]: moduleId,
          ...(config.declaration ? { [`${entry}.d`]: declarationFileName } : {}),
        }),
      };
    },
    resolveId: {
      filter: { id: exactIds(moduleId, declarationFileName) },
      handler(id) {
        if (id === moduleId) return sourceFileName;
        return id === declarationFileName ? declarationFileName : null;
      },
    },
    load: {
      order: 'pre',
      filter: { id: exactIds(sourceFileName, declarationFileName) },
      handler(id) {
        if (id !== sourceFileName && id !== declarationFileName) return null;
        const generated = loadSchema();
        for (const file of generated.watchFiles) this.addWatchFile(file);
        return {
          code: id === sourceFileName ? generated.code : createDeclaration(generated.code, sourceFileName),
          moduleType: 'ts',
        };
      },
    },
  };
}

function addEntries(input: InputOption | undefined, entries: Record<string, string>): InputOption {
  if (!input) return entries;
  const ids = Object.values(entries);
  if (typeof input === 'string') return [input, ...ids];
  if (Array.isArray(input)) return [...new Set([...input, ...ids])];

  for (const name of Object.keys(entries)) {
    if (Object.hasOwn(input, name)) throw new Error(`Schema entry conflicts with an existing input: \`${name}\`.`);
  }

  return { ...input, ...entries };
}

function exactIds(...ids: readonly string[]): RegExp {
  return new RegExp(`^(?:${ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`);
}

function createDeclaration(code: string, fileName: string): string {
  const result = ts.transpileDeclaration(code, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    reportDiagnostics: true,
  });
  const errors = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

  if (errors?.length) {
    throw new Error(
      `Could not generate the schema declaration for ${fileName}:\n${ts.formatDiagnostics(errors, {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n',
      })}`
    );
  }

  return result.outputText;
}
