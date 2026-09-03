import { resolve } from 'node:path';

import type { TransformModule } from 'vjsc/plugins';
import type { StyleTransformOptions } from 'vjsc/styles';
import type { ComponentTarget } from 'vjsc/target';

import { skinStyles } from '../src/meta.ts';
import { skinBaseStylesheet } from './skin.ts';
import { createComponentTargets } from './target/index.ts';
import { parseVariant, type SkinVariant } from './variants.ts';

/** Alias kept while callers move to `parseVariant`. */
export const validateSkinConfig = parseVariant;

export type SkinTransformConfig = SkinVariant;

const stylesDir = resolve(import.meta.dirname, '../src/styles');

export function resolveSkinComponents(module: TransformModule): readonly ComponentTarget[] | null {
  const config = parseVariant(module.params);

  return config ? createComponentTargets(config) : null;
}

export function resolveSkinStyles(module: TransformModule): StyleTransformOptions | null {
  const config = parseVariant(module.params);

  return config ? createStyleOptions(config) : null;
}

export function createStyleOptions(config: SkinTransformConfig): StyleTransformOptions {
  const skin = config.skin ? skinStyles[config.skin] : undefined;
  const variants: string[] = skin ? [skin.theme] : ['default'];

  if (skin) variants.push(skin.preset);

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
          base: resolve(stylesDir, skinBaseStylesheet(skin?.preset ?? 'video')),
          scope: skin?.scope ?? '.media-skin',
        },
      };
}
