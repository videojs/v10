import type { ComponentTarget } from 'vjsc/target';
import { createHtmlIconTarget, createReactIconTarget } from '../../../icons/vjsc/target';
import { skinStyles } from '../meta';
import { htmlComponentTarget } from './html';
import { reactComponentTarget } from './react';

const reactIcons = new Map<string, ComponentTarget>();
const htmlIcons = new Map<string, ComponentTarget>();

export function resolveComponentTargets(parameters: URLSearchParams): readonly ComponentTarget[] {
  const target = parameters.get('target');
  if (target !== 'react' && target !== 'html') return [];

  const skin = parameters.get('skin');
  if (!skin || !(skin in skinStyles)) return [];

  const family = skinStyles[skin as keyof typeof skinStyles].theme;
  const cache = target === 'react' ? reactIcons : htmlIcons;
  let icons = cache.get(family);
  if (!icons) {
    const created = target === 'react' ? createReactIconTarget({ family }) : createHtmlIconTarget({ family });
    cache.set(family, created);
    icons = created;
  }

  return [target === 'react' ? reactComponentTarget : htmlComponentTarget, icons];
}
