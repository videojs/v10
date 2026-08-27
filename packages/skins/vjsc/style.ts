import { resolve } from 'node:path';

import type { StylePluginOptions } from 'vjsc/styles';

import type { SkinConfig } from './config.ts';
import { skinStyles } from './meta.ts';

const stylesDir = resolve(import.meta.dirname, 'styles');

export function createStyleOptions(config: SkinConfig): StylePluginOptions {
  const skin = skinStyles[config.skin];
  const variants: string[] = [skin.theme];

  if (skin.variant !== skin.theme) variants.push(skin.variant);

  if (!variants.includes(config.skin)) variants.push(config.skin);

  if (config.target === 'html') variants.push('shadow-dom');

  return config.style === 'tailwind'
    ? {
        mode: 'tailwind',
        variants,
      }
    : {
        mode: 'css',
        variants,
        stylesheet: {
          input: resolve(stylesDir, 'tailwind.compiler.css'),
          base: resolve(stylesDir, 'base.css'),
          scope: skin.scope,
        },
      };
}
