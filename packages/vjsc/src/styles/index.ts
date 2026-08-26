import type { CompileStylesOptions } from './compile';
import type { DesignSystem } from './design-system';
import type { StyleManifest } from './manifest';

export type { CompileStylesOptions } from './compile';
export {
  type StyleDefinition,
  type StyleReferences,
  type StyleRule,
  type StyleTree,
  type StyleValue,
  styles,
} from './define';
export type { DesignSystem } from './design-system';
export type { StyleManifest, StyleManifestRule } from './manifest';
export type { StylePluginOptions, StylesheetOptions } from './options';

export async function loadStyleManifest(files: readonly string[]): Promise<StyleManifest> {
  return (await import('./manifest')).loadStyleManifest(files);
}

export async function collectReferencedStyleRules(
  files: readonly string[],
  manifest: StyleManifest
): Promise<ReadonlySet<string>> {
  return (await import('./manifest')).collectReferencedStyleRules(files, manifest);
}

export async function compileStyles(options: CompileStylesOptions): Promise<Map<string, string>> {
  return (await import('./compile')).compileStyles(options);
}

export async function loadDesignSystem(input: string): Promise<DesignSystem> {
  return (await import('./design-system')).loadDesignSystem(input);
}
