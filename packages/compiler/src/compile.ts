import ts from 'typescript';
import {
  type CompilerAsset,
  type CompilerConfig,
  type CompilerContext,
  type CompilerDiagnostic,
  type CompilerPipelineStep,
  type CompilerPlugin,
  type CompilerSourceMap,
  type CompilerTransform,
  jsx,
} from './config';
import { fatalDiagnosticFromError, withDiagnosticSource } from './diagnostics';
import { parse } from './parse';
import { identitySourceMap, printSourceFile } from './source-map';
import { dropUnusedImports } from './transforms/drop-unused-imports';
import { dropUnusedLocals } from './transforms/drop-unused-locals';
import { transformImports } from './transforms/imports';

export interface CompileOptions {
  filename?: string | undefined;
  config?: CompilerConfig | undefined;
  /** Directory relative paths in `imports` rules resolve against. Typically the compiler.config.js dir. */
  configDir?: string | undefined;
  /** Output file path (used to project relative-path import targets). */
  outputFile?: string | undefined;
}

export interface CompileResult {
  code: string;
  map: CompilerSourceMap;
  assets: readonly CompilerAsset[];
  diagnostics: readonly CompilerDiagnostic[];
}

export class CompilerError extends Error {
  constructor(
    public readonly diagnostics: readonly CompilerDiagnostic[],
    options?: { cause?: unknown }
  ) {
    super(diagnostics[0]?.message ?? '@videojs/compiler failed', options);
    this.name = 'CompilerError';
  }
}

interface PipelineTransform {
  plugin: string;
  transform: CompilerTransform;
}

interface PipelineFinisher {
  plugin: string;
  finish: () => void | Promise<void>;
}

/**
 * Compile a constrained-JSX source module to a target-flavored TSX module.
 *
 * 1. Parse the source into a TSX SourceFile.
 * 2. Apply pre transforms, configured import rewrites, and normal transforms.
 * 3. Apply target transforms, then post transforms and safe cleanup.
 * 4. Print transformed source with mappings back to the authored module.
 */
export async function compile(source: string, options: CompileOptions = {}): Promise<CompileResult> {
  const filename = options.filename ?? 'input.tsx';
  const config = options.config ?? {};
  const target = config.target ?? jsx();
  const assets: CompilerAsset[] = [];
  const diagnostics: CompilerDiagnostic[] = [];
  const context: CompilerContext = {
    filename,
    configDir: options.configDir ?? process.cwd(),
    ...(options.outputFile ? { outputFile: options.outputFile } : {}),
    addAsset(asset) {
      assets.push(asset);
    },
    report(diagnostic) {
      diagnostics.push(withDiagnosticSource(diagnostic, source, filename));
    },
  };

  const { ast, diagnostics: parseDiagnostics } = parse(source, { filename });
  if (parseDiagnostics.length > 0) throw new CompilerError(parseDiagnostics);

  const preTransforms: PipelineTransform[] = [];
  const normalTransforms: PipelineTransform[] = [];
  const postTransforms: PipelineTransform[] = [];
  const finishers: PipelineFinisher[] = [];
  let importTransform: PipelineTransform | undefined;

  if (target.imports) {
    importTransform = {
      plugin: '@videojs/compiler:imports',
      transform: transformImports({
        rules: target.imports,
        configDir: context.configDir,
        outputFile: options.outputFile,
      }),
    };
  }

  for (const plugin of orderPlugins(config.plugins ?? [])) {
    const step = await setupPipelineStep(
      plugin.name,
      () => plugin.setup?.(pluginContext(context, plugin.name)),
      filename,
      source
    );
    if (step?.transform) {
      const entry = { plugin: plugin.name, transform: step.transform };
      if (plugin.enforce === 'pre') preTransforms.push(entry);
      else if (plugin.enforce === 'post') postTransforms.push(entry);
      else normalTransforms.push(entry);
    }
    if (step?.finish) finishers.push({ plugin: plugin.name, finish: step.finish });
  }

  const targetTransforms = (target.transforms ?? []).map((transform) => ({
    plugin: '@videojs/compiler:target',
    transform,
  }));
  const transformers: PipelineTransform[] = [
    ...preTransforms,
    ...(importTransform ? [importTransform] : []),
    ...normalTransforms,
    ...targetTransforms,
    ...postTransforms,
  ];

  // Final passes: prune locals the rewrites left behind, then prune imports.
  // Order matters — dropping a local may make the imports it referenced
  // unused. Always run when any transformer ran.
  if (transformers.length > 0) {
    transformers.push({ plugin: '@videojs/compiler:cleanup', transform: dropUnusedLocals() });
    transformers.push({ plugin: '@videojs/compiler:cleanup', transform: dropUnusedImports() });
  }

  if (transformers.length === 0) {
    await runFinishers(finishers, filename, source);
    return {
      code: source,
      map: identitySourceMap(source, filename, options.outputFile),
      assets,
      diagnostics,
    };
  }

  let result: ts.TransformationResult<ts.SourceFile> | undefined;
  try {
    result = ts.transform(
      ast,
      transformers.map((entry) => attributedTransform(entry, filename, source))
    );
    const transformed = result.transformed[0]!;
    const printed = printSourceFile(transformed, source, options.outputFile ?? filename);

    await runFinishers(finishers, filename, source);

    return { code: printed.code, map: printed.map, assets, diagnostics };
  } catch (error) {
    if (error instanceof CompilerError) throw error;
    throw new CompilerError([fatalDiagnosticFromError(error, { filename, sourceText: source })], { cause: error });
  } finally {
    result?.dispose();
  }
}

function pluginContext(context: CompilerContext, plugin: string): CompilerContext {
  return {
    ...context,
    report(diagnostic) {
      context.report({ ...diagnostic, plugin: diagnostic.plugin ?? plugin });
    },
  };
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

async function runFinishers(finishers: readonly PipelineFinisher[], filename: string, source: string): Promise<void> {
  for (const entry of finishers) {
    try {
      await entry.finish();
    } catch (error) {
      throw compilerErrorFromPlugin(error, entry.plugin, filename, source);
    }
  }
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

function orderPlugins(plugins: readonly CompilerPlugin[]): CompilerPlugin[] {
  const pre = plugins.filter((plugin) => plugin.enforce === 'pre');
  const normal = plugins.filter((plugin) => plugin.enforce === undefined);
  const post = plugins.filter((plugin) => plugin.enforce === 'post');
  return [...pre, ...normal, ...post];
}

async function setupPipelineStep(
  plugin: string,
  setup: () => CompilerPipelineStep | Promise<CompilerPipelineStep | undefined> | undefined,
  filename: string,
  source: string
): Promise<CompilerPipelineStep | undefined> {
  try {
    return await setup();
  } catch (error) {
    throw new CompilerError([fatalDiagnosticFromError(error, { filename, sourceText: source, plugin })], {
      cause: error,
    });
  }
}
