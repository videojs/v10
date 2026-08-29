import type { VjscModule, VjscModuleConfig } from 'vjsc/plugins';

import { type SkinName, skinStyles } from './meta.ts';
import { createStyleOptions } from './style.ts';
import { createComponentTargets } from './target/index.ts';

export interface SkinConfig {
  readonly target: 'html' | 'react';
  readonly skin?: SkinName | undefined;
  readonly style: 'tailwind' | 'css';
}

export function configureSkinModule({ parameters }: VjscModule): VjscModuleConfig | null {
  const config = validateSkinConfig(parameters);
  if (!config) return null;

  return {
    targets: createComponentTargets(config),
    styles: createStyleOptions(config),
  };
}

export function validateSkinConfig(parameters: URLSearchParams): SkinConfig | null {
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
