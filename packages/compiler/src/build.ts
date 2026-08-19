import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { type ExternalOption, type OutputChunk, type Plugin, rolldown } from 'rolldown';
import type {
  CompilerAsset,
  CompilerBuildConfig,
  CompilerConfig,
  CompilerDiagnostic,
  CompilerExternal,
  CompilerInput,
} from './config';
import { HTML_RUNTIME, HTML_RUNTIME_ID, HTML_RUNTIME_IMPORT, renderHtmlChunk } from './targets/html';
import { transform } from './transform';

const SOURCE_MODULE_RE = /\.[cm]?[jt]sx?$/;

export interface BuildOptions {
  configDir?: string | undefined;
  cwd?: string | undefined;
}

export interface OutputChunkFile {
  readonly type: 'chunk';
  readonly fileName: string;
  readonly source: string;
  /** External module imports retained by an emitted chunk. */
  readonly imports: readonly string[];
}

export interface OutputAssetFile {
  readonly type: 'asset';
  readonly fileName: string;
  readonly source: string;
}

export type OutputFile = OutputChunkFile | OutputAssetFile;

export interface BuildResult {
  files: readonly OutputFile[];
  diagnostics: readonly CompilerDiagnostic[];
}

interface BuildEntry {
  name: string;
  inputFile: string;
  outputFile: string;
}

/** Resolve, transform, and bundle configured entry graphs into output files. */
export async function build(config: CompilerBuildConfig, options: BuildOptions = {}): Promise<BuildResult> {
  const files: OutputFile[] = [];
  const diagnostics: CompilerDiagnostic[] = [];
  const outputs = new Map<string, string>();

  for (const entryConfig of Array.isArray(config) ? config : [config]) {
    const result = await buildConfig(entryConfig, options);
    diagnostics.push(...result.diagnostics);
    for (const file of result.files) {
      if (outputs.has(file.fileName)) throw new Error(`Compiler build output collision: ${file.fileName}`);
      outputs.set(file.fileName, file.source);
      files.push(file);
    }
  }

  return { files, diagnostics };
}

async function buildConfig(config: CompilerConfig, options: BuildOptions): Promise<BuildResult> {
  if (!config.input) throw new Error('Compiler build config requires `input`.');

  const configDir = options.configDir ?? options.cwd ?? process.cwd();
  const entries = normalizeEntries(
    config.input,
    configDir,
    config.output?.entryFileNames,
    config.output?.dir,
    config.output?.file
  );
  const files: OutputFile[] = [];
  const diagnostics: CompilerDiagnostic[] = [];

  for (const entry of entries) {
    const result = await buildEntry(entry, config, configDir);
    diagnostics.push(...result.diagnostics);
    files.push(...result.files);
  }

  return { files, diagnostics };
}

async function buildEntry(entry: BuildEntry, config: CompilerConfig, configDir: string): Promise<BuildResult> {
  const diagnostics: CompilerDiagnostic[] = [];
  const assets: CompilerAsset[] = [];
  const target = config.target ?? { name: 'jsx' as const };
  const isHtml = target.name === 'html';
  const external = externalOption(config.external);
  const bundle = await rolldown({
    input: entry.inputFile,
    platform: 'neutral',
    ...(external ? { external } : {}),
    plugins: [compilerPlugin(config, configDir, entry.outputFile, diagnostics, assets, isHtml)],
    transform: {
      jsx: isHtml ? { runtime: 'automatic', importSource: 'vjsc/html-runtime' } : 'preserve',
    },
    // The output target intentionally overrides source-project JSX settings.
    checks: { configurationFieldConflict: false },
    experimental: { attachDebugInfo: 'none' },
  });

  try {
    const output = await bundle.generate({
      format: isHtml ? 'cjs' : 'esm',
      comments: false,
      codeSplitting: false,
    });
    const chunks = output.output.filter((item): item is OutputChunk => item.type === 'chunk');
    if (chunks.length !== 1 || !chunks[0]) {
      throw new Error(
        `Compiler build expected one output chunk for \`${entry.inputFile}\`, but received ${chunks.length}.`
      );
    }

    const imports = [...chunks[0].imports].sort();
    const source = isHtml ? renderHtmlChunk(chunks[0].code, entry.inputFile, imports) : chunks[0].code;

    return {
      diagnostics,
      files: [
        {
          type: 'chunk',
          fileName: entry.outputFile,
          source: `${config.output?.banner ?? ''}${source}`,
          imports,
        },
        ...assets.map((asset) => outputFromAsset(asset, entry.outputFile)),
      ],
    };
  } finally {
    await bundle.close();
  }
}

function compilerPlugin(
  config: CompilerConfig,
  configDir: string,
  outputFile: string,
  diagnostics: CompilerDiagnostic[],
  assets: CompilerAsset[],
  html: boolean
): Plugin {
  return {
    name: 'vjsc:build',
    resolveId(source) {
      if (html && source === HTML_RUNTIME_IMPORT) return HTML_RUNTIME_ID;
      return null;
    },
    load(id) {
      if (id === HTML_RUNTIME_ID) return { code: HTML_RUNTIME, moduleType: 'js' };
      return null;
    },
    async transform(source, id) {
      if (!SOURCE_MODULE_RE.test(id) || id.startsWith('\0')) return null;
      const result = await transform(source, { filename: id, config, configDir, outputFile });
      diagnostics.push(...result.diagnostics);
      assets.push(...result.assets);
      for (const file of result.watchFiles) this.addWatchFile(file);
      return { code: result.code, map: result.map, moduleType: moduleType(id) };
    },
  };
}

function externalOption(external: CompilerExternal | undefined): ExternalOption | undefined {
  if (!external) return undefined;
  if (typeof external === 'function') return (source, importer) => external(source, importer ?? undefined);
  const sources = new Set(external);
  return (source) => sources.has(source);
}

function moduleType(id: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  if (id.endsWith('.tsx')) return 'tsx';
  if (id.endsWith('.ts') || id.endsWith('.mts') || id.endsWith('.cts')) return 'ts';
  if (id.endsWith('.jsx')) return 'jsx';
  return 'js';
}

function normalizeEntries(
  input: CompilerInput,
  configDir: string,
  entryFileNames = '[name].js',
  outputDir = 'dist',
  outputFile: string | undefined
): BuildEntry[] {
  const entries = inputEntries(input, configDir);
  if (outputFile && entries.length !== 1) {
    throw new Error('Compiler build can only use `output.file` with one input entry.');
  }

  const outputs = new Set<string>();
  return entries.map((entry) => {
    const file = outputFile
      ? resolve(configDir, outputFile)
      : resolve(configDir, join(outputDir, renderEntryFileName(entryFileNames, entry.name, entry.inputFile)));
    if (outputs.has(file)) throw new Error(`Compiler build output collision: ${file}`);
    outputs.add(file);
    return { ...entry, outputFile: file };
  });
}

function inputEntries(input: CompilerInput, configDir: string): Array<Omit<BuildEntry, 'outputFile'>> {
  if (typeof input === 'string') {
    const inputFile = resolve(configDir, input);
    return [{ name: entryNameFromPath(inputFile), inputFile }];
  }

  if (Array.isArray(input)) {
    const names = new Set<string>();
    return input.map((file) => {
      const inputFile = resolve(configDir, file);
      const name = entryNameFromPath(inputFile);
      if (names.has(name)) throw new Error(`Compiler build input name collision: ${name}`);
      names.add(name);
      return { name, inputFile };
    });
  }

  return Object.entries(input).map(([name, file]) => ({ name, inputFile: resolve(configDir, file) }));
}

function outputFromAsset(asset: CompilerAsset, entryOutputFile: string): OutputAssetFile {
  const fileName = isAbsolute(asset.fileName) ? asset.fileName : resolve(dirname(entryOutputFile), asset.fileName);
  return { type: 'asset', fileName, source: asset.source };
}

function entryNameFromPath(path: string): string {
  const base = basename(path);
  const ext = extname(base);
  return ext ? base.slice(0, -ext.length) : base;
}

function renderEntryFileName(pattern: string, name: string, inputFile: string): string {
  const base = basename(inputFile);
  const ext = extname(base);
  return pattern
    .replaceAll('[name]', name)
    .replaceAll('[base]', base)
    .replaceAll('[ext]', ext.startsWith('.') ? ext.slice(1) : ext);
}
