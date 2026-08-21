import type { CompilerModule, CompilerPlugin } from '../ts/types';
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

export type { StylePluginOptions, StylesheetOptions } from './plugin';

export type StylePluginConfig =
  | StylePluginOptions
  | ((module: CompilerModule) => StylePluginOptions | null | Promise<StylePluginOptions | null>);

export type { StyleMode } from './transform';

/** Create the compiler styles plugin without loading its Node-only backend into authored style modules. */
export function stylesPlugin(config: StylePluginConfig): CompilerPlugin {
  const implementations = new Map<string, Promise<CompilerPlugin>>();
  const manifestIds = new WeakMap<object, number>();
  let nextManifestId = 0;

  return {
    name: 'vjsc:styles',
    async transform(module, context) {
      const options = typeof config === 'function' ? await config(module) : config;
      if (!options) return null;
      const key = stylePluginKey(options, manifestIds, () => nextManifestId++);
      let implementation = implementations.get(key);
      if (!implementation) {
        implementation = import('./plugin').then((loaded) => loaded.plugin(options));
        implementations.set(key, implementation);
      }
      return (await implementation).transform?.(module, context) ?? null;
    },
  };
}

function stylePluginKey(
  options: StylePluginOptions,
  manifestIds: WeakMap<object, number>,
  nextManifestId: () => number
): string {
  let manifest: number | undefined;
  if (options.manifest) {
    manifest = manifestIds.get(options.manifest);
    if (manifest === undefined) {
      manifest = nextManifestId();
      manifestIds.set(options.manifest, manifest);
    }
  }

  return JSON.stringify({
    mode: options.mode,
    variant: options.variant,
    stylesheet: options.stylesheet,
    manifest,
  });
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
