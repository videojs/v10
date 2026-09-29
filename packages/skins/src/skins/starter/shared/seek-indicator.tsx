import * as $ from '@videojs/core/vjsc';
import { ChevronIcon } from '@videojs/icons/vjsc';

import styles from './skin.styles';

/** Feedback for the arrow-key and double-tap seeks, shown on the side it seeks towards. */
export function SeekIndicator() {
  return (
    <$.SeekIndicator.Root className={[styles.indicator, styles.seekIndicator]}>
      <ChevronIcon className={styles.seekIndicatorIcon} />
      <$.SeekIndicator.Value className={styles.seekIndicatorValue} />
    </$.SeekIndicator.Root>
  );
}
