import type ts from 'typescript';
import type { ImportRule } from './transforms/imports';

export type CompilerTransform = ts.TransformerFactory<ts.SourceFile>;

export interface CompilerAsset {
  type: 'css';
  fileName: string;
  source: string;
  sourceFile?: string | undefined;
}

export interface CompilerDiagnostic {
  level: 'warning' | 'error';
  code: string;
  message: string;
  file?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  endLine?: number | undefined;
  endColumn?: number | undefined;
  sourceText?: string | undefined;
  plugin?: string | undefined;
}

export interface CompilerSourceMap {
  version: 3;
  file: string | null;
  sourceRoot?: string;
  sources: Array<string | null>;
  sourcesContent?: Array<string | null | undefined>;
  names: string[];
  mappings: string;
}

export interface CompilerContext {
  filename: string;
  configDir: string;
  outputFile?: string | undefined;
  addAsset(asset: CompilerAsset): void;
  report(diagnostic: CompilerDiagnostic): void;
}

export interface CompilerPipelineStep {
  transform?: CompilerTransform | undefined;
  finish?: (() => void | Promise<void>) | undefined;
}

export type CompilerPluginEnforce = 'pre' | 'post';

export interface CompilerPlugin {
  name: string;
  /**
   * `pre` runs before configured import rewrites. Normal plugins run after
   * import rewrites and before target transforms. `post` runs after target
   * transforms and before compiler cleanup.
   */
  enforce?: CompilerPluginEnforce | undefined;
  setup?(context: CompilerContext): CompilerPipelineStep | Promise<CompilerPipelineStep>;
}

/** Source transformations shared by JSX and HTML targets. */
export interface CompilerTargetOptions {
  /** Per-source-module rewrite rules. */
  imports?: Record<string, ImportRule> | undefined;
  /** Transforms applied in order after `transformImports`. */
  transforms?: readonly CompilerTransform[] | undefined;
}

export interface JsxTarget {
  name: 'jsx';
  imports?: Record<string, ImportRule> | undefined;
  transforms?: readonly CompilerTransform[] | undefined;
}

export interface HtmlTarget {
  name: 'html';
  imports?: Record<string, ImportRule> | undefined;
  transforms?: readonly CompilerTransform[] | undefined;
}

export type CompilerTarget = JsxTarget | HtmlTarget;

export type CompilerExternal = readonly string[] | ((source: string, importer: string | undefined) => boolean);

export interface CompilerConfig {
  input?: CompilerInput | undefined;
  external?: CompilerExternal | undefined;
  output?: CompilerOutputOptions | undefined;
  plugins?: readonly CompilerPlugin[] | undefined;
  target?: CompilerTarget | undefined;
}

export type CompilerBuildConfig = CompilerConfig | readonly CompilerConfig[];

export type CompilerInput = string | readonly string[] | Record<string, string>;

export interface CompilerOutputOptions {
  dir?: string | undefined;
  file?: string | undefined;
  entryFileNames?: string | undefined;
  banner?: string | undefined;
}

export function defineConfig<const Config extends CompilerBuildConfig>(config: Config): Config {
  return config;
}

export function jsx(options: CompilerTargetOptions = {}): JsxTarget {
  return {
    name: 'jsx',
    ...(options.imports ? { imports: options.imports } : {}),
    ...(options.transforms ? { transforms: options.transforms } : {}),
  };
}

/** Emit a statically rendered HTML entry when used with `build()`. */
export function html(options: CompilerTargetOptions = {}): HtmlTarget {
  return {
    name: 'html',
    ...(options.imports ? { imports: options.imports } : {}),
    ...(options.transforms ? { transforms: options.transforms } : {}),
  };
}
