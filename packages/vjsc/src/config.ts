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
  sourceText: string;
  configDir: string;
  target: CompilerTarget;
  outputFile?: string | undefined;
  addAsset(asset: CompilerAsset): void;
  addWatchFile(fileName: string): void;
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

export interface JsxTargetOptions extends CompilerTargetOptions {
  /** JSX runtime used by the tool that lowers a JSX projection. */
  importSource?: string | undefined;
}

export interface JsxTarget {
  name: 'jsx';
  importSource?: string | undefined;
  imports?: Record<string, ImportRule> | undefined;
  transforms?: readonly CompilerTransform[] | undefined;
}

export interface HtmlTarget {
  name: 'html';
  imports?: Record<string, ImportRule> | undefined;
  transforms?: readonly CompilerTransform[] | undefined;
}

export type CompilerTarget = JsxTarget | HtmlTarget;

export interface CompilerConfig {
  plugins?: readonly CompilerPlugin[] | undefined;
  target?: CompilerTarget | undefined;
}

export function jsx(options: JsxTargetOptions = {}): JsxTarget {
  return {
    name: 'jsx',
    ...(options.importSource ? { importSource: options.importSource } : {}),
    ...(options.imports ? { imports: options.imports } : {}),
    ...(options.transforms ? { transforms: options.transforms } : {}),
  };
}

/** Transform canonical JSX into the static HTML runtime representation. */
export function html(options: CompilerTargetOptions = {}): HtmlTarget {
  return {
    name: 'html',
    ...(options.imports ? { imports: options.imports } : {}),
    ...(options.transforms ? { transforms: options.transforms } : {}),
  };
}
