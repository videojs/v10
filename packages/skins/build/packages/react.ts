import type { Graph, GraphModule } from 'vjsc/graph';
import { bundleStyles, collectModules, relativeImport, rewriteImports, stripStyleImports } from 'vjsc/graph';

import { isSkinName, type SkinMeta, type SkinModuleMeta, type SkinName } from '../../src/meta.ts';
import { skinPreset, skinPresets, type SkinPreset } from '../skin.ts';
import type { GeneratedPackageFile } from './files.ts';
import { addCopiedFiles, addGenerated, generatedFiles, pascalCase } from './utils.ts';

const packageRoot = 'packages/react/src';
const internalRoot = `${packageRoot}/internal/skins`;
const radioGroupImports = new Set([
  '@videojs/react/ui/audio-track-radio-group',
  '@videojs/react/ui/captions-radio-group',
  '@videojs/react/ui/playback-rate-radio-group',
  '@videojs/react/ui/quality-radio-group',
]);

export interface CreateReactPackageSkinsOptions {
  readonly workspaceDir: string;
  readonly baseStyles?: readonly string[] | undefined;
}

interface ReactSkin {
  readonly root: ReactSkinRoot;
  readonly modules: readonly GraphModule<SkinModuleMeta>[];
  readonly preset: SkinPreset;
  readonly theme: SkinMeta['style']['theme'];
}

type ReactSkinRoot = GraphModule<SkinMeta & { readonly name: SkinName }> & {
  readonly meta: SkinMeta & { readonly name: SkinName };
};

/** Generate package-local React Skin implementations from one finalized VJSC module graph. */
export async function createReactPackageSkins(
  graph: Graph<SkinModuleMeta>,
  options: CreateReactPackageSkinsOptions
): Promise<GeneratedPackageFile[]> {
  const skins = reactSkins(graph);
  const sharedSourcePaths = collectSharedSourcePaths(skins);
  const destinations = new Map<string, string>();

  for (const skin of skins) {
    for (const module of skin.modules) {
      destinations.set(module.id, reactModulePath(skin, module, sharedSourcePaths));
    }
  }

  const generated = new Map<string, string>();

  for (const [destination, modules] of modulesByDestination(skins, destinations)) {
    const stripped = new Set(modules.map((module) => stripStyleImports(module.source)));
    const candidates = stripped.size === 1 ? [modules[0]!] : modules;

    for (const module of candidates) {
      const source = rewriteImports(graph, module, ({ dependency, reference }) => {
        const frameworkImport = reactFrameworkImport(reference.specifier);
        if (frameworkImport) return relativeImport(destination, frameworkImport);

        if (!dependency) return undefined;

        const target = destinations.get(dependency.id);
        if (!target) throw new Error(`React Skin dependency has no generated target: \`${dependency.sourcePath}\`.`);

        return relativeImport(destination, target);
      });

      addGenerated(generated, destination, stripStyleImports(source));
    }
  }

  for (const skin of skins) {
    const publicRoot = `${packageRoot}/presets/${skin.preset}`;
    const publicName = skin.theme === 'minimal' ? 'minimal-skin' : 'skin';
    const component = `${skin.theme === 'minimal' ? 'Minimal' : ''}${pascalCase(skin.preset)}Skin`;
    const generatedComponent = `${pascalCase(skin.theme)}${pascalCase(skin.preset)}Skin`;
    const generatedRoot = destinations.get(skin.root.id)!;

    addGenerated(
      generated,
      `${publicRoot}/${publicName}.tsx`,
      reactSkinWrapper({
        component,
        generatedComponent,
        importSource: relativeImport(`${publicRoot}/${publicName}.tsx`, generatedRoot),
        video: skin.preset.endsWith('video'),
      })
    );
    addGenerated(
      generated,
      `${publicRoot}/${publicName}.css`,
      await bundleStyles(graph, skin.modules, {
        label: `${skin.theme}-${skin.preset}`,
        files: options.baseStyles ?? ['./styles/base.css'],
      })
    );
  }

  await addCopiedFiles(generated, options.workspaceDir, [
    ['packages/skins/src/presets/background/react/skin.tsx', `${packageRoot}/presets/background/skin.tsx`],
    ['packages/skins/src/presets/background/react/skin.css', `${packageRoot}/presets/background/skin.css`],
  ]);

  return generatedFiles(generated);
}

export function reactPackageSkinOwnedPaths(): string[] {
  const publicPaths = skinPresets.flatMap((preset) =>
    ['skin.tsx', 'skin.css', 'minimal-skin.tsx', 'minimal-skin.css'].map(
      (filename) => `${packageRoot}/presets/${preset}/${filename}`
    )
  );

  return [
    internalRoot,
    ...publicPaths,
    `${packageRoot}/presets/background/skin.tsx`,
    `${packageRoot}/presets/background/skin.css`,
  ];
}

function reactSkins(graph: Graph<SkinModuleMeta>): ReactSkin[] {
  const roots = [...graph.modules.values()].filter(
    (module): module is ReactSkinRoot =>
      module.meta?.type === 'skin' &&
      isSkinName(module.meta.name) &&
      module.params.target === 'react' &&
      module.params.style === 'css' &&
      module.params.skin === module.meta.name
  );

  if (roots.length !== skinPresets.length * 2) {
    throw new Error(`Expected ${skinPresets.length * 2} React CSS Skin roots, received ${roots.length}.`);
  }

  return roots
    .map((root) => {
      const preset = skinPreset(root.meta.name);

      return {
        root,
        modules: collectModules(graph, root.id),
        preset,
        theme: root.meta.style.theme,
      };
    })
    .sort((left, right) => left.root.meta.name.localeCompare(right.root.meta.name));
}

function reactModulePath(
  skin: ReactSkin,
  module: GraphModule<SkinModuleMeta>,
  sharedSourcePaths: ReadonlySet<string>
): string {
  const ownedPrefix = `skins/${skin.root.meta.name}/`;

  if (module.sourcePath.startsWith(ownedPrefix)) {
    return `${internalRoot}/${skin.root.meta.name}/${module.sourcePath.slice(ownedPrefix.length)}`;
  }

  return sharedSourcePaths.has(module.sourcePath)
    ? `${internalRoot}/shared/${module.sourcePath}`
    : `${internalRoot}/${skin.root.meta.name}/${module.sourcePath}`;
}

function collectSharedSourcePaths(skins: readonly ReactSkin[]): ReadonlySet<string> {
  const sources = new Map<string, Set<string>>();

  for (const skin of skins) {
    for (const module of skin.modules) {
      const variants = sources.get(module.sourcePath) ?? new Set<string>();

      variants.add(stripStyleImports(module.source));
      sources.set(module.sourcePath, variants);
    }
  }

  return new Set([...sources].filter(([, variants]) => variants.size === 1).map(([sourcePath]) => sourcePath));
}

function reactFrameworkImport(specifier: string): string | undefined {
  if (specifier === '@videojs/react' || radioGroupImports.has(specifier) || specifier === 'clsx') {
    return `${packageRoot}/internal/skin-primitives.ts`;
  }

  if (specifier === '@videojs/react/icons') return `${packageRoot}/icons/index.ts`;

  if (specifier === '@videojs/react/icons/minimal') return `${packageRoot}/icons/minimal/index.ts`;

  return undefined;
}

function reactSkinWrapper(options: {
  readonly component: string;
  readonly generatedComponent: string;
  readonly importSource: string;
  readonly video: boolean;
}): string {
  const props = `${options.component}Props`;
  const base = options.video ? 'BaseVideoSkinProps' : 'BaseSkinProps';

  return `'use client';

import { ${options.generatedComponent} as Skin } from '${options.importSource}';

import type { ${base} } from '../types';

export interface ${props} extends ${base} {}

export function ${options.component}(props: ${props}) {
  return <Skin {...props} />;
}
`;
}

function modulesByDestination(
  skins: readonly ReactSkin[],
  destinations: ReadonlyMap<string, string>
): Array<readonly [string, readonly GraphModule<SkinModuleMeta>[]]> {
  const grouped = new Map<string, Map<string, GraphModule<SkinModuleMeta>>>();

  for (const skin of skins) {
    for (const module of skin.modules) {
      const destination = destinations.get(module.id)!;
      const modules = grouped.get(destination) ?? new Map();

      modules.set(module.id, module);
      grouped.set(destination, modules);
    }
  }

  return [...grouped]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([destination, modules]) => [destination, [...modules.values()]] as const);
}
