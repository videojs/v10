import { type SkinName, skinStyles } from './meta';

export interface SkinConfig {
  readonly target: 'html' | 'react';
  readonly skin: SkinName;
  readonly style: 'tailwind' | 'vanilla';
}

export function validateSkinConfig(parameters: URLSearchParams): SkinConfig | null {
  const target = parameters.get('target');
  const skin = parameters.get('skin');
  const style = parameters.get('style');

  if (
    (target !== 'react' && target !== 'html') ||
    !skin ||
    !(skin in skinStyles) ||
    (style !== 'tailwind' && style !== 'vanilla')
  ) {
    return null;
  }

  return { target, skin: skin as SkinName, style };
}
