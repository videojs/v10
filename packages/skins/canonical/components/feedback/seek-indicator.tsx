import * as $ from '@videojs/core/components';
import { ChevronIcon } from '@videojs/icons/components';
import styles from '../../styles/components/seek-indicator.styles';

export function SeekIndicator() {
  return (
    <$.SeekIndicator.Root className={styles.root}>
      <ChevronIcon className={styles.icon} />
      <$.SeekIndicator.Value className={styles.value} />
    </$.SeekIndicator.Root>
  );
}
