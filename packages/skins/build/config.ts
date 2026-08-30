import { relative, resolve } from 'node:path';

import type { EntriesOptions, TransformModule } from '../../vjsc/src/plugins/index.ts';
import { resolveSkinComponents, resolveSkinStyles } from '../src/config.ts';
import { isSkinName, skinStyles } from '../src/meta.ts';
import { registryTargets } from './registry/targets.ts';

export const packageDir = resolve(import.meta.dirname, '..');
export const sourceDir = resolve(packageDir, 'src');
export const skinUtils = resolve(sourceDir, 'utils.ts');

const publishedSkins = Object.keys(skinStyles).filter(isSkinName);

export const skinEntries: EntriesOptions = {
  root: sourceDir,
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

export function resolveBuildComponents(module: TransformModule) {
  return module.filename === skinUtils ? null : resolveSkinComponents(module);
}

export function resolveBuildStyles(module: TransformModule) {
  return module.filename === skinUtils ? null : resolveSkinStyles(module);
}

export function skinModuleSourcePath(filename: string): string {
  return relative(sourceDir, filename).replaceAll('\\', '/');
}
