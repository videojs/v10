import type { ComponentTarget } from 'vjsc/target';

import { createHtmlIconTarget, createReactIconTarget } from '../../../icons/vjsc/target.ts';
import type { SkinConfig } from '../config.ts';
import { htmlComponentTarget } from './html.tsx';
import { reactComponentTarget } from './react.tsx';

const iconFamilies = ['default', 'minimal'] as const;
let reactIcons: ComponentTarget | undefined;
let htmlIcons: ComponentTarget | undefined;

export function createComponentTargets(config: SkinConfig): readonly ComponentTarget[] {
  let icons = config.target === 'react' ? reactIcons : htmlIcons;

  if (!icons) {
    const created =
      config.target === 'react'
        ? createReactIconTarget({ families: iconFamilies })
        : createHtmlIconTarget({ families: iconFamilies });

    icons = created;

    if (config.target === 'react') reactIcons = created;
    else htmlIcons = created;
  }

  return [config.target === 'react' ? reactComponentTarget : htmlComponentTarget, icons];
}
