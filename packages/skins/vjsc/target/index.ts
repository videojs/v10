import type { ComponentTarget } from 'vjsc/target';
import { createHtmlIconTarget, createReactIconTarget } from '../../../icons/vjsc/target';
import type { SkinConfig } from '../config';
import { skinStyles } from '../meta';
import { htmlComponentTarget } from './html';
import { reactComponentTarget } from './react';

const reactIcons = new Map<string, ComponentTarget>();
const htmlIcons = new Map<string, ComponentTarget>();

export function createComponentTargets(config: SkinConfig): readonly ComponentTarget[] {
  const family = skinStyles[config.skin].theme;
  const cache = config.target === 'react' ? reactIcons : htmlIcons;

  let icons = cache.get(family);

  if (!icons) {
    const created = config.target === 'react' ? createReactIconTarget({ family }) : createHtmlIconTarget({ family });
    cache.set(family, created);
    icons = created;
  }

  return [config.target === 'react' ? reactComponentTarget : htmlComponentTarget, icons];
}
