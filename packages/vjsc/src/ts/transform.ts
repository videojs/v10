import ts from 'typescript';
import { moduleFilename } from '../utils/module-id';
import { fatalDiagnosticFromError, withDiagnosticSource } from './diagnostics';
import { parse } from './parse';
import { identitySourceMap, printSourceFile } from './source-map';
import { dropUnusedImports } from './transforms/drop-unused-imports';
import { dropUnusedLocals } from './transforms/drop-unused-locals';
import type {
  CompilerAsset,
  CompilerDiagnostic,
  CompilerModule,
  CompilerOptions,
  CompilerPlugin,
  CompilerSetupContext,
  CompilerSourceMap,
  CompilerTransform,
  CompilerTransformContext,
} from './types';

export interface TransformOptions extends CompilerOptions {
  /** Full source module ID. Defaults to `input.tsx`. */
  id?: string | undefined;
  /** Output file path used to project relative-path import targets. */
  outputFile?: string | undefined;
}

export interface CompilerTransformOptions {
  /** Full source module ID. Defaults to `input.tsx`. */
  id?: string | undefined;
  /** Output file path used to project relative-path import targets. */
  outputFile?: string | undefined;
}

export interface TransformResult {
  code: string;
  map: CompilerSourceMap;
  assets: readonly CompilerAsset[];
  watchFiles: readonly string[];
  diagnostics: readonly CompilerDiagnostic[];
  meta: Readonly<Record<string, unknown>>;
}

export interface Compiler {
  transform(source: string, options?: CompilerTransformOptions): Promise<TransformResult>;
}

export class CompilerError extends Error {
  constructor(
    public readonly diagnostics: readonly CompilerDiagnostic[],
    options?: { cause?: unknown }
  ) {
    super(diagnostics[0]?.message ?? 'vjsc failed', options);
    this.name = 'CompilerError';
  }
}

/** Create a compiler whose plugins are initialized once and reused across modules. */
export async function createCompiler(options: CompilerOptions = {}): Promise<Compiler> {
  const cwd = options.cwd ?? process.cwd();
  const plugins = [...(options.plugins ?? [])];
  const setupWatchFiles = new Set<string>();
  const setupContext: CompilerSetupContext = {
    cwd,
    addWatchFile(fileName) {
      setupWatchFiles.add(fileName);
    },
  };

  for (const plugin of plugins) {
    try {
      await plugin.setup?.(setupContext);
    } catch (error) {
      throw compilerErrorFromPlugin(error, plugin.name, 'input.tsx', '');
    }
  }

  return {
    transform(source, transformOptions = {}) {
      return transformModule(source, transformOptions, plugins, cwd, setupWatchFiles);
    },
  };
}

/** Compile one module with a one-use compiler instance. */
export async function transform(source: string, options: TransformOptions = {}): Promise<TransformResult> {
  const compiler = await createCompiler({
    ...(options.cwd ? { cwd: options.cwd } : {}),
    ...(options.plugins ? { plugins: options.plugins } : {}),
  });
  return compiler.transform(source, {
    ...(options.id ? { id: options.id } : {}),
    ...(options.outputFile ? { outputFile: options.outputFile } : {}),
  });
}

async function transformModule(
  source: string,
  options: CompilerTransformOptions,
  plugins: readonly CompilerPlugin[],
  cwd: string,
  setupWatchFiles: ReadonlySet<string>
): Promise<TransformResult> {
  const id = options.id ?? 'input.tsx';
  const filename = moduleFilename(id);
  const assets: CompilerAsset[] = [];
  const watchFiles = new Set(setupWatchFiles);
  const diagnostics: CompilerDiagnostic[] = [];
  const meta: Record<string, unknown> = {};
  const preambles: string[] = [];
  const transformations: ts.TransformationResult<ts.SourceFile>[] = [];
  const { ast, diagnostics: parseDiagnostics } = parse(source, { filename });
  if (parseDiagnostics.length > 0) throw new CompilerError(parseDiagnostics);

  let sourceFile = ast;
  let transformed = false;
  let currentPlugin = '';
  const context: CompilerTransformContext = {
    cwd,
    ...(options.outputFile ? { outputFile: options.outputFile } : {}),
    meta,
    apply(input, compilerTransform) {
      const result = ts.transform(input, [
        attributedTransform({ plugin: currentPlugin, transform: compilerTransform }, filename, source),
      ]);
      transformations.push(result);
      return result.transformed[0]!;
    },
    prepend(code) {
      preambles.push(code);
    },
    addAsset(asset) {
      assets.push(asset);
    },
    addWatchFile(fileName) {
      watchFiles.add(fileName);
    },
    report(diagnostic) {
      diagnostics.push(
        withDiagnosticSource(
          { ...diagnostic, plugin: diagnostic.plugin ?? (currentPlugin || undefined) },
          source,
          filename
        )
      );
    },
  };

  try {
    for (const plugin of plugins) {
      if (!plugin.transform) continue;
      currentPlugin = plugin.name;
      const module: CompilerModule = { code: source, id, sourceFile };
      let next: ts.SourceFile | null;
      try {
        next = await plugin.transform(module, context);
      } catch (error) {
        throw compilerErrorFromPlugin(error, plugin.name, filename, source);
      }
      if (!next) continue;
      sourceFile = next;
      transformed = true;
    }

    if (transformed) {
      currentPlugin = 'vjsc:cleanup';
      sourceFile = context.apply(sourceFile, dropUnusedLocals());
      sourceFile = context.apply(sourceFile, dropUnusedImports());
    }

    if (!transformed) {
      const prefix = sourcePrefix(preambles);
      return {
        code: `${prefix}${source}`,
        map: offsetSourceMap(identitySourceMap(source, filename, options.outputFile), lineCount(prefix)),
        assets,
        watchFiles: [...watchFiles],
        diagnostics,
        meta,
      };
    }

    const printed = printSourceFile(sourceFile, source, options.outputFile ?? filename);
    const prefix = sourcePrefix(preambles);
    return {
      code: `${prefix}${printed.code}`,
      map: offsetSourceMap(printed.map, lineCount(prefix)),
      assets,
      watchFiles: [...watchFiles],
      diagnostics,
      meta,
    };
  } catch (error) {
    if (error instanceof CompilerError) throw error;
    throw new CompilerError([fatalDiagnosticFromError(error, { filename, sourceText: source })], { cause: error });
  } finally {
    for (const result of transformations.reverse()) result.dispose();
  }
}

function sourcePrefix(preambles: readonly string[]): string {
  return preambles.length === 0 ? '' : `${preambles.join('\n')}\n`;
}

function lineCount(value: string): number {
  return value.match(/\n/g)?.length ?? 0;
}

function offsetSourceMap(map: CompilerSourceMap, lines: number): CompilerSourceMap {
  return lines === 0 ? map : { ...map, mappings: `${';'.repeat(lines)}${map.mappings}` };
}

interface PipelineTransform {
  plugin: string;
  transform: CompilerTransform;
}

function attributedTransform(entry: PipelineTransform, filename: string, source: string): CompilerTransform {
  return (context) => {
    let transform: ts.Transformer<ts.SourceFile>;
    try {
      transform = entry.transform(context);
    } catch (error) {
      throw compilerErrorFromPlugin(error, entry.plugin, filename, source);
    }

    return (sourceFile) => {
      try {
        return transform(sourceFile);
      } catch (error) {
        throw compilerErrorFromPlugin(error, entry.plugin, filename, source);
      }
    };
  };
}

function compilerErrorFromPlugin(error: unknown, plugin: string, filename: string, source: string): CompilerError {
  if (error instanceof CompilerError) {
    if (error.diagnostics.every((diagnostic) => diagnostic.plugin)) return error;
    const diagnostics = error.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      plugin: diagnostic.plugin ?? plugin,
    }));
    return new CompilerError(diagnostics, { cause: error });
  }
  return new CompilerError([fatalDiagnosticFromError(error, { filename, sourceText: source, plugin })], {
    cause: error,
  });
}
