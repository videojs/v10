import type { BufferingIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';
import styles from '../../styles/components/buffering.styles';

export function BufferingIndicator({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.BufferingIndicator className={[styles.root, className]} {...props}>
      <SpinnerIcon className={styles.spinner} />
    </$.BufferingIndicator>
  );
}
