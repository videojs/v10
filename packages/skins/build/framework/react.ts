import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { ComponentGraph, ValidatedComponentGraphModule } from 'vjsc/graph';
import {
  collectComponentGraphModules,
  createComponentGraphStyles,
  relativeComponentGraphImport,
  rewriteComponentGraphImports,
  stripComponentGraphStyleImports,
  validateComponentGraph,
} from 'vjsc/graph';

import { isSkinName, type SkinMeta, type SkinModuleMeta, type SkinName } from '../../vjsc/meta.ts';
import type { GeneratedFrameworkFile } from './files.ts';

const packageRoot = 'packages/react/src';
const internalRoot = `${packageRoot}/internal/skins`;
const presets = ['audio', 'live-audio', 'live-video', 'video'] as const;
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
  readonly modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[];
  readonly preset: (typeof presets)[number];
  readonly theme: SkinMeta['style']['theme'];
}

type ReactSkinRoot = ValidatedComponentGraphModule<SkinMeta & { readonly name: SkinName }> & {
  readonly meta: SkinMeta & { readonly name: SkinName };
};

/** Generate package-local React Skin implementations from one finalized VJSC component graph. */
export async function createReactPackageSkins(
  graph: ComponentGraph<SkinModuleMeta>,
  options: CreateReactPackageSkinsOptions
): Promise<GeneratedFrameworkFile[]> {
  const skins = reactSkins(graph);
  const destinations = new Map<string, string>();

  for (const skin of skins) {
    for (const module of skin.modules) destinations.set(module.id, reactModulePath(skin, module));
  }

  const generated = new Map<string, string>();

  for (const module of uniqueModules(skins.flatMap((skin) => skin.modules))) {
    const destination = destinations.get(module.id)!;
    const source = rewriteComponentGraphImports(graph, module, ({ dependency, reference }) => {
      const frameworkImport = reactFrameworkImport(reference.specifier);
      if (frameworkImport) return relativeComponentGraphImport(destination, frameworkImport);

      if (!dependency) return undefined;

      const target = destinations.get(dependency.id);
      if (!target) throw new Error(`React Skin dependency has no generated target: \`${dependency.sourcePath}\`.`);

      return relativeComponentGraphImport(destination, target);
    });

    addGenerated(generated, destination, stripComponentGraphStyleImports(source));
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
        importSource: relativeComponentGraphImport(`${publicRoot}/${publicName}.tsx`, generatedRoot),
        video: skin.preset.endsWith('video'),
      })
    );
    addGenerated(
      generated,
      `${publicRoot}/${publicName}.css`,
      await createComponentGraphStyles(graph, skin.modules, {
        label: `${skin.theme}-${skin.preset}`,
        files: options.baseStyles ?? ['./styles/base.css'],
      })
    );
  }

  for (const path of [
    'packages/skins/framework/react/background/skin.tsx',
    'packages/skins/framework/react/background/skin.css',
  ]) {
    addGenerated(
      generated,
      path.replace('packages/skins/framework/react', packageRoot + '/presets'),
      await readFile(resolve(options.workspaceDir, path), 'utf8')
    );
  }

  return [...generated]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => ({ path, content }));
}

export function reactPackageSkinOwnedPaths(): string[] {
  const publicPaths = presets.flatMap((preset) =>
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

function reactSkins(graph: ComponentGraph<SkinModuleMeta>): ReactSkin[] {
  const modules = validateComponentGraph(graph);
  const roots = [...modules.values()].filter(
    (module): module is ReactSkinRoot =>
      module.meta?.type === 'skin' &&
      isSkinName(module.meta.name) &&
      module.transform.target === 'react' &&
      module.transform.style === 'css' &&
      module.transform.skin === module.meta.name
  );

  if (roots.length !== presets.length * 2) {
    throw new Error(`Expected ${presets.length * 2} React CSS Skin roots, received ${roots.length}.`);
  }

  return roots
    .map((root) => {
      const preset = presetForSkin(root.meta.name);

      return {
        root,
        modules: collectComponentGraphModules(graph, root.id),
        preset,
        theme: root.meta.style.theme,
      };
    })
    .sort((left, right) => left.root.meta.name.localeCompare(right.root.meta.name));
}

function reactModulePath(skin: ReactSkin, module: ValidatedComponentGraphModule<SkinModuleMeta>): string {
  const ownedPrefix = `skins/${skin.root.meta.name}/`;

  return module.sourcePath.startsWith(ownedPrefix)
    ? `${internalRoot}/${skin.root.meta.name}/${module.sourcePath.slice(ownedPrefix.length)}`
    : `${internalRoot}/shared/${module.sourcePath}`;
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
  const parameters = options.video ? `{ renderPoster, ...props }: ${props}` : `props: ${props}`;
  const forwarded = options.video ? 'poster={renderPoster} {...props}' : '{...props}';

  return `'use client';

import { ${options.generatedComponent} as Skin } from '${options.importSource}';

import type { ${base} } from '../types';

export interface ${props} extends ${base} {}

export function ${options.component}(${parameters}) {
  return <Skin ${forwarded} />;
}
`;
}

function presetForSkin(name: SkinName): ReactSkin['preset'] {
  const preset = name.replace(/^(?:default|minimal)-/, '');
  if (!isPreset(preset)) throw new Error(`Unsupported Skin preset: \`${name}\`.`);

  return preset;
}

function isPreset(value: string): value is ReactSkin['preset'] {
  return presets.some((preset) => preset === value);
}

function uniqueModules(
  modules: readonly ValidatedComponentGraphModule<SkinModuleMeta>[]
): ValidatedComponentGraphModule<SkinModuleMeta>[] {
  return [...new Map(modules.map((module) => [module.id, module])).values()];
}

function pascalCase(value: string): string {
  return value.replace(/(?:^|-)([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function addGenerated(files: Map<string, string>, path: string, content: string): void {
  const previous = files.get(path);

  if (previous !== undefined && previous !== content) {
    throw new Error(`React package Skin output collision: \`${path}\`.`);
  }

  files.set(path, content);
}
