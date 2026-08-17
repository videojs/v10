import * as $ from '@videojs/core/components';
import { SpinnerIcon } from '@videojs/icons/components';
import styles from '../../styles/components/buffering.styles';

export function BufferingIndicator() {
  return (
    <$.BufferingIndicator className={styles.root}>
      <SpinnerIcon className={styles.spinner} />
    </$.BufferingIndicator>
  );
}
