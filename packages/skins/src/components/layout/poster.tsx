import type { PosterImageProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { type PropsOf, type PropsWithChildren, Slot } from 'vjsc/components';

import type { SkinComponentDescription } from '../../meta';
import styles from '../../styles/layout/poster.styles';

export interface PosterProps extends CoreProps {
  /** Draws the poster image in place of the one the skin renders. */
  renderImage?: PropsOf<typeof $.Poster.Image>['children'];
}

export function Poster({ children, className, renderImage, ...props }: PropsWithChildren<PosterProps> = {}) {
  return (
    <$.Poster.Root className={[styles.root, className]}>
      <Slot name="poster">
        <$.Poster.Image className={styles.image} {...props}>
          {renderImage}
        </$.Poster.Image>
      </Slot>
      {children}
    </$.Poster.Root>
  );
}

export const meta = {
  title: 'Poster',
  description: 'The video poster and its presentation styling shared by Skin compositions.',
} as const satisfies SkinComponentDescription;
