import { collectModules, type Graph, type GraphModule } from '../../vjsc/src/graph/index.ts';
import { isSkinName, type SkinMeta, type SkinModuleMeta, type SkinName, skinStyles } from '../src/meta.ts';
import { registryTargets } from './registry/targets.ts';
import { type SkinPreset, skinPreset, skinPresets } from './skin.ts';

export type SkinFramework = 'html' | 'react';
export type SkinStyling = 'css' | 'tailwind';

/**
 * One compilation of authored skin source. HTML output is always compiled for a skin because its CSS is scoped per
 * skin; React components also compile skin-free so the registry can publish them on their own.
 */
export interface SkinVariant {
  readonly target: SkinFramework;
  readonly style: SkinStyling;
  readonly skin?: SkinName | undefined;
}

/** A finalized skin root module together with everything it composes. */
export interface SkinRoot {
  readonly root: SkinRootModule;
  readonly modules: readonly GraphModule<SkinModuleMeta>[];
  readonly preset: SkinPreset;
  readonly theme: SkinMeta['style']['theme'];
}

export type SkinRootModule = GraphModule<SkinMeta & { readonly name: SkinName }> & {
  readonly meta: SkinMeta & { readonly name: SkinName };
};

const publishedSkins = Object.keys(skinStyles).filter(isSkinName);

/** The variants one authored module is compiled for. Skin-owned modules compile for their skin only. */
export function variantsFor(filename: string): readonly SkinVariant[] {
  const ownedSkin = publishedSkins.find((name) => filename.includes(`/skins/${name}/`));

  return registryTargets.map(({ framework, styling }) => {
    if (ownedSkin) return { target: framework, style: styling, skin: ownedSkin };

    return framework === 'html'
      ? { target: framework, style: styling, skin: 'default-video' }
      : { target: framework, style: styling };
  });
}

/** Read a variant from a module's transform query, or `null` when the query does not describe one. */
export function parseVariant(parameters: URLSearchParams): SkinVariant | null {
  const target = parameters.get('target');
  const style = parameters.get('style');
  if ((target !== 'react' && target !== 'html') || (style !== 'tailwind' && style !== 'css')) return null;

  const requested = parameters.get('skin');
  const skin = requested && isSkinName(requested) ? requested : undefined;
  if (requested && !skin) return null;

  if (!skin && target !== 'react') return null;

  return { target, ...(skin ? { skin } : {}), style };
}

/** The query parameters that select a variant. */
export function variantParams(variant: SkinVariant): Readonly<Record<string, string>> {
  return { target: variant.target, ...(variant.skin ? { skin: variant.skin } : {}), style: variant.style };
}

/** Collect every skin root compiled for one framework and styling, with its module closure, sorted by skin name. */
export function skinRoots(graph: Graph<SkinModuleMeta>, variant: Pick<SkinVariant, 'target' | 'style'>): SkinRoot[] {
  const roots = [...graph.modules.values()].filter(
    (module): module is SkinRootModule =>
      module.meta?.type === 'skin' &&
      isSkinName(module.meta.name) &&
      module.params.target === variant.target &&
      module.params.style === variant.style &&
      module.params.skin === module.meta.name
  );
  const expected = skinPresets.length * 2;

  if (roots.length !== expected) {
    throw new Error(`Expected ${expected} ${variant.target} ${variant.style} Skin roots, received ${roots.length}.`);
  }

  return roots
    .map((root) => ({
      root,
      modules: collectModules(graph, root.id),
      preset: skinPreset(root.meta.name),
      theme: root.meta.style.theme,
    }))
    .sort((left, right) => left.root.meta.name.localeCompare(right.root.meta.name));
}
