import type { SeekIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { ChevronIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/seek-indicator.styles';

export function SeekIndicator({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.SeekIndicator.Root className={[styles.root, className]} {...props}>
      <ChevronIcon className={styles.icon} />
      <$.SeekIndicator.Value className={styles.value} />
    </$.SeekIndicator.Root>
  );
}
