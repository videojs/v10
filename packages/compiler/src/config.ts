import type ts from 'typescript';
import type { ImportRule } from './transforms/imports';

/**
 * Bulk-defined component entry. Globs `files`, derives each component's name
 * from the filename (extension stripped) via `name(stem)`, and inline-emits
 * `createComponent({ name })` calls. Components defined this way are
 * BaseProps-only — to type Props, parts, or partProps, use a manifest file.
 */
export interface BulkComponentEntry {
  files: string;
  name: (filename: string) => string;
}

export type ComponentEntry = string | BulkComponentEntry;

export interface GenerateConfig {
  /**
   * Component sources. Each entry is either:
   * - a glob string matching `*-component.ts` manifest files, or
   * - a `{ files, name }` object that bulk-defines components from arbitrary files.
   */
  components: readonly ComponentEntry[];
  /** Path the generator writes the components file to. */
  output: string;
}

/**
 * Per-target compile configuration. Currently only `react` is shipped, but
 * the shape is extensible for `html`/etc.
 */
export interface ReactTargetConfig {
  /** Per-source-module rewrite rules. */
  imports: Record<string, ImportRule>;
  /** Plugins applied in order after `transformImports`. */
  plugins?: readonly ts.TransformerFactory<ts.SourceFile>[];
}

export interface CompileTargetsConfig {
  react?: ReactTargetConfig;
}

export interface CompilerConfig {
  generate?: GenerateConfig;
  /** Per-target compile rules consumed by `compile()`. */
  targets?: CompileTargetsConfig;
}

export function defineConfig(config: CompilerConfig): CompilerConfig {
  return config;
}
