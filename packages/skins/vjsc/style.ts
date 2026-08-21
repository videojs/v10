import { resolve } from 'node:path';

import type { StylePluginOptions } from 'vjsc/styles';
import { skinStyles } from './meta';

const stylesDir = resolve(import.meta.dirname, 'styles');

export function resolveStyleOptions(parameters: URLSearchParams): StylePluginOptions | null {
  const skinName = parameters.get('skin');
  const style = parameters.get('style');
  if (!skinName || !(skinName in skinStyles) || (style !== 'tailwind' && style !== 'vanilla')) return null;

  const skin = skinStyles[skinName as keyof typeof skinStyles];

  return style === 'tailwind'
    ? { mode: 'tailwind', variant: skin.variant }
    : {
        mode: 'css',
        variant: skin.variant,
        stylesheet: {
          input: resolve(stylesDir, 'tailwind.css'),
          scope: `.${skin.scope}`,
        },
      };
}
