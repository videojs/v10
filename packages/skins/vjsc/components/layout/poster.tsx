import type { PosterProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { type PropsWithChildren, Slot } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/layout/poster.styles';

export function Poster({ children, className, src, ...props }: PropsWithChildren<CoreProps> = {}) {
  return (
    <$.Poster className={[styles.root, className]} src={src} {...props}>
      <Slot name="poster">{children}</Slot>
    </$.Poster>
  );
}

export const meta = {
  name: 'poster',
  type: 'component',
  title: 'Poster',
  description: 'The video poster and its presentation styling shared by Skin compositions.',
} as const satisfies SkinComponentMeta;
