import type { BufferingIndicatorProps as CoreProps } from '@videojs/core';
import * as $ from '@videojs/core/vjsc';
import { SpinnerIcon } from '@videojs/icons/vjsc';
import type { Props } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
import styles from '../../styles/feedback/buffering-indicator.styles';

export function BufferingIndicator({ className, ...props }: Props<CoreProps> = {}) {
  return (
    <$.BufferingIndicator className={[styles.root, className]} {...props}>
      <SpinnerIcon className={styles.spinnerIcon} />
    </$.BufferingIndicator>
  );
}

export const meta = {
  name: 'buffering-indicator',
  type: 'component',
  title: 'Buffering Indicator',
  description: 'A delayed spinner displayed while media is waiting for data.',
} as const satisfies SkinComponentMeta;
