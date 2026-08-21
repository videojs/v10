import { resolve } from 'node:path';

import type { StylePluginOptions } from 'vjsc/styles';
import type { SkinConfig } from './config';
import { skinStyles } from './meta';

const stylesDir = resolve(import.meta.dirname, 'styles');

export function createStyleOptions(config: SkinConfig): StylePluginOptions {
  const skin = skinStyles[config.skin];

  return config.style === 'tailwind'
    ? {
        mode: 'tailwind',
        variant: skin.variant,
      }
    : {
        mode: 'css',
        variant: skin.variant,
        stylesheet: {
          input: resolve(stylesDir, 'tailwind.css'),
          scope: `.${skin.scope}`,
        },
      };
}
