import type { ComponentTarget } from 'vjsc/target';

import { createHtmlIconTarget, createReactIconTarget } from '../../../icons/vjsc/target.ts';
import type { SkinConfig } from '../config.ts';
import { skinStyles } from '../meta.ts';
import { htmlComponentTarget } from './html.tsx';
import { reactComponentTarget } from './react.tsx';

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
