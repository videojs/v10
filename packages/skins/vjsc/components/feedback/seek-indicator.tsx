import type { SeekIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { ChevronIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/feedback/seek-indicator.styles';

export function SeekIndicator({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.SeekIndicator.Root className={[styles.root, className]} {...props}>
      <ChevronIcon className={styles.icon} />
      <$.SeekIndicator.Value className={styles.value} />
    </$.SeekIndicator.Root>
  );
}

export const meta = {
  name: 'seek-indicator',
  type: 'component',
  title: 'Seek Indicator',
  description: 'Visual feedback for forward and backward seek actions.',
} as const satisfies SkinComponentMeta;
