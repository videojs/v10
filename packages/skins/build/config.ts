import { relative, resolve } from 'node:path';

import type { EntriesOptions, TransformModule } from '../../vjsc/src/plugins/index.ts';
import { resolveSkinComponents, resolveSkinStyles } from './transform.ts';
import { variantParams, variantsFor } from './variants.ts';

export const packageDir = resolve(import.meta.dirname, '..');
export const sourceDir = resolve(packageDir, 'src');
export const skinUtils = resolve(sourceDir, 'utils.ts');

export const skinEntries: EntriesOptions = {
  root: sourceDir,
  include: ['./components/**/*.tsx', './skins/**/skin.tsx', './utils.ts'],
  resolve: {
    params(entry) {
      if (entry.filename === skinUtils) return [{}];

      return variantsFor(entry.filename).map(variantParams);
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
