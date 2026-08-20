import type { PosterProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { type PropsWithChildren, Slot } from 'vjsc/components';
import styles from '../../styles/components/poster.styles';

export function Poster({ children, className, src, ...props }: PropsWithChildren<CoreProps> = {}) {
  return (
    <$.Poster className={[styles.root, className]} src={src} {...props}>
      <Slot name="poster">{children}</Slot>
    </$.Poster>
  );
}
