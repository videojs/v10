import { resolve } from 'node:path';

import type { TransformModule } from 'vjsc/plugins';
import type { StyleTransformOptions } from 'vjsc/styles';
import type { ComponentTarget } from 'vjsc/target';

import { type SkinName, skinStyles } from '../src/meta.ts';
import { createComponentTargets } from './target/index.ts';

const stylesDir = resolve(import.meta.dirname, '../src/styles');

export interface SkinTransformConfig {
  readonly target: 'html' | 'react';
  readonly skin?: SkinName | undefined;
  readonly style: 'tailwind' | 'css';
}

export function resolveSkinComponents(module: TransformModule): readonly ComponentTarget[] | null {
  const config = validateSkinConfig(module.params);

  return config ? createComponentTargets(config) : null;
}

export function resolveSkinStyles(module: TransformModule): StyleTransformOptions | null {
  const config = validateSkinConfig(module.params);

  return config ? createStyleOptions(config) : null;
}

export function validateSkinConfig(parameters: URLSearchParams): SkinTransformConfig | null {
  const target = parameters.get('target');
  const skin = parameters.get('skin');

  const style = parameters.get('style');
  if ((target !== 'react' && target !== 'html') || (style !== 'tailwind' && style !== 'css')) return null;

  if (skin && !(skin in skinStyles)) return null;

  if (!skin && target !== 'react') return null;

  return {
    target,
    ...(skin ? { skin: skin as SkinName } : {}),
    style,
  };
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
          base: resolve(stylesDir, 'base.css'),
          scope: skin?.scope ?? '.media-skin',
        },
      };
}
