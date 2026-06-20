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

export interface StylePipeline {
  name: string;
  setup(context: CompilerContext): CompilerPipelineStep | Promise<CompilerPipelineStep>;
}

/** Per-target compile configuration for JSX transforms. */
export interface JsxTargetOptions {
  /** Per-source-module rewrite rules. */
  imports?: Record<string, ImportRule> | undefined;
  /** Transforms applied in order after `transformImports`. */
  transforms?: readonly CompilerTransform[] | undefined;
}

export interface CompilerTarget {
  name: 'jsx';
  imports?: Record<string, ImportRule> | undefined;
  transforms?: readonly CompilerTransform[] | undefined;
}

export interface CompilerConfig {
  files?: readonly string[] | undefined;
  target?: CompilerTarget | undefined;
  styles?: StylePipeline | undefined;
}

export function defineConfig<const Config extends CompilerConfig>(config: Config): Config {
  return config;
}

export function jsx(options: JsxTargetOptions = {}): CompilerTarget {
  return {
    name: 'jsx',
    ...(options.imports ? { imports: options.imports } : {}),
    ...(options.transforms ? { transforms: options.transforms } : {}),
  };
}
