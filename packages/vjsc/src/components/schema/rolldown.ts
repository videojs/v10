import { resolve } from 'node:path';

import type { InputOption, Plugin } from 'rolldown';
import ts from 'typescript';
import { type CreateSchemaModuleOptions, createSchemaModule } from './generate';

export interface SchemaPluginOptions extends Omit<CreateSchemaModuleOptions, 'cwd' | 'output'> {
  /** Output entry name without its JavaScript or declaration extension. */
  readonly entry?: string | undefined;
  /** Whether to add the companion declaration as a host build entry. */
  readonly declaration?: boolean | undefined;
}

/** Create a virtual component-schema entry directly inside a bundler config. */
export function schemaPlugin(config: SchemaPluginOptions): Plugin {
  const entry = config.entry ?? 'vjsc';
  const moduleId = `\0vjsc:schema:${entry}`;
  let state: SchemaPluginState | undefined;

  const loadSchema = (current: SchemaPluginState) =>
    createSchemaModule({
      cwd: current.cwd,
      source: config.source,
      include: config.include,
      ...(config.exclude ? { exclude: config.exclude } : {}),
      output: current.sourceFileName,
    });

  return {
    name: 'vjsc:schema',
    options(options) {
      const cwd = resolve(options.cwd ?? process.cwd());
      state = {
        cwd,
        sourceFileName: resolve(cwd, `${entry}.ts`),
        declarationFileName: resolve(cwd, `${entry}.d.ts`),
      };

      return {
        ...options,
        input: addEntries(options.input, {
          [entry]: moduleId,
          ...(config.declaration ? { [`${entry}.d`]: state.declarationFileName } : {}),
        }),
      };
    },
    resolveId(id) {
      const current = requireState(state);
      if (id === moduleId) return current.sourceFileName;
      return id === current.declarationFileName ? current.declarationFileName : null;
    },
    load: {
      order: 'pre',
      handler(id) {
        const current = requireState(state);
        if (id !== current.sourceFileName && id !== current.declarationFileName) return null;
        const generated = loadSchema(current);
        for (const file of generated.watchFiles) this.addWatchFile(file);
        return {
          code:
            id === current.sourceFileName ? generated.code : createDeclaration(generated.code, current.sourceFileName),
          moduleType: 'ts',
        };
      },
    },
  };
}

interface SchemaPluginState {
  readonly cwd: string;
  readonly sourceFileName: string;
  readonly declarationFileName: string;
}

function requireState(state: SchemaPluginState | undefined): SchemaPluginState {
  if (!state) throw new Error('The schema plugin was used before Rolldown initialized its input options.');
  return state;
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
