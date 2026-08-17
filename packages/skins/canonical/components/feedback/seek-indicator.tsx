import { SeekIndicator as SeekIndicatorPrimitive } from '@videojs/core/components';
import { ChevronIcon } from '@videojs/icons/components';
import styles from '../../styles/components/seek-indicator.styles';

export function SeekIndicator() {
  return (
    <SeekIndicatorPrimitive.Root className={styles.root}>
      <ChevronIcon className={styles.icon} />
      <SeekIndicatorPrimitive.Value className={styles.value} />
    </SeekIndicatorPrimitive.Root>
  );
}
