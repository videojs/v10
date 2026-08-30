import { relative, resolve } from 'node:path';

import type { Plugin } from 'vite';

import { componentGraphPlugin, type VjscModule } from '../../vjsc/src/plugins/index.ts';
import { resolveSkinComponents, resolveSkinStyles } from '../vjsc/config.ts';
import { isSkinName, type SkinModuleMeta, skinStyles } from '../vjsc/meta.ts';
import { registryTargets } from './targets.ts';

export const packageDir = resolve(import.meta.dirname, '..');
export const vjscDir = resolve(packageDir, 'vjsc');
export const registryUtils = resolve(vjscDir, 'utils.ts');

const publishedSkins = Object.keys(skinStyles).filter(isSkinName);

export const registryGraph = componentGraphPlugin<SkinModuleMeta>({
  root: vjscDir,
  include: ['./components/**/*.tsx', './skins/**/skin.tsx', './utils.ts'],
  transformations(module) {
    if (module.filename === registryUtils) return [{}];

    const ownedSkin = publishedSkins.find((name) => module.filename.includes(`/skins/${name}/`));

    if (ownedSkin) {
      return registryTargets.map(({ framework, styling }) => ({ target: framework, skin: ownedSkin, style: styling }));
    }

    return registryTargets.map(({ framework, styling }) =>
      framework === 'html'
        ? { target: framework, skin: 'default-video', style: styling }
        : { target: framework, style: styling }
    );
  },
});

export function resolveRegistryComponents(module: VjscModule) {
  return module.filename === registryUtils ? null : resolveSkinComponents(module);
}

export function resolveRegistryStyles(module: VjscModule) {
  return module.filename === registryUtils ? null : resolveSkinStyles(module);
}

export function registryModuleSourcePath(filename: string): string {
  return relative(vjscDir, filename).replaceAll('\\', '/');
}

/** Keep the source build limited to static Shadcn registry assets. */
export function registryAssetsOnly(): Plugin {
  return {
    name: 'skins:registry-assets-only',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const filename of Object.keys(bundle)) {
          if (!filename.startsWith('r/')) delete bundle[filename];
        }
      },
    },
  };
}
