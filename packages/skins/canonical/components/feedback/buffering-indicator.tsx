import { BufferingIndicator as BufferingIndicatorPrimitive } from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import styles from '../../styles/components/buffering.tailwind';

export function BufferingIndicator() {
  return (
    <BufferingIndicatorPrimitive className={styles.bufferingIndicator}>
      <SpinnerIcon className={styles.bufferingSpinnerIcon} />
    </BufferingIndicatorPrimitive>
  );
}
