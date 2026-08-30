import { relative, resolve } from 'node:path';

import type { VjscEntriesOptions, VjscModule } from '../../vjsc/src/plugins/index.ts';
import { registryTargets } from '../registry/targets.ts';
import { resolveSkinComponents, resolveSkinStyles } from '../vjsc/config.ts';
import { isSkinName, skinStyles } from '../vjsc/meta.ts';

export const packageDir = resolve(import.meta.dirname, '..');
export const vjscDir = resolve(packageDir, 'vjsc');
export const skinUtils = resolve(vjscDir, 'utils.ts');

const publishedSkins = Object.keys(skinStyles).filter(isSkinName);

export const skinEntries: VjscEntriesOptions = {
  root: vjscDir,
  include: ['./components/**/*.tsx', './skins/**/skin.tsx', './utils.ts'],
  resolve: {
    params(entry) {
      if (entry.filename === skinUtils) return [{}];

      const ownedSkin = publishedSkins.find((name) => entry.filename.includes(`/skins/${name}/`));

      if (ownedSkin) {
        return registryTargets.map(({ framework, styling }) => ({
          target: framework,
          skin: ownedSkin,
          style: styling,
        }));
      }

      return registryTargets.map(({ framework, styling }) =>
        framework === 'html'
          ? { target: framework, skin: 'default-video', style: styling }
          : { target: framework, style: styling }
      );
    },
  },
};

export function resolveBuildComponents(module: VjscModule) {
  return module.filename === skinUtils ? null : resolveSkinComponents(module);
}

export function resolveBuildStyles(module: VjscModule) {
  return module.filename === skinUtils ? null : resolveSkinStyles(module);
}

export function skinModuleSourcePath(filename: string): string {
  return relative(vjscDir, filename).replaceAll('\\', '/');
}
