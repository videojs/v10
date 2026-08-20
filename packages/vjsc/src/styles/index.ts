import type { CompilerPlugin } from '../config';
import type { CompileStylesOptions } from './compile';
import type { DesignSystem } from './design-system';
import type { StyleManifest } from './manifest';
import type { StylePluginOptions } from './plugin';

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

export type { StyleEmitOptions, StylePluginOptions } from './plugin';

export type { StyleMode } from './transform';

/** Create the compiler styles plugin without loading its Node-only backend into authored style modules. */
export function plugin(options: StylePluginOptions): CompilerPlugin {
  return {
    name: 'vjsc:styles',
    enforce: 'pre',
    async setup(context) {
      const implementation = await import('./plugin');
      return implementation.plugin(options).setup?.(context) ?? {};
    },
  };
}

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
