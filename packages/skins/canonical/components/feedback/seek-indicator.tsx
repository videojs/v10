import { SeekIndicator as SeekIndicatorPrimitive } from '@videojs/core/components';
import { ChevronIcon } from '@videojs/icons/components';
import styles from '../../styles/components/seek-indicator.tailwind';

export function SeekIndicator() {
  return (
    <SeekIndicatorPrimitive.Root className={styles.seekIndicator}>
      <ChevronIcon className={styles.seekIndicatorIcon} />
      <SeekIndicatorPrimitive.Value className={styles.seekIndicatorValue} />
    </SeekIndicatorPrimitive.Root>
  );
}
