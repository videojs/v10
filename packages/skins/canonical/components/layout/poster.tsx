import * as $ from '@videojs/core/components';
import { Slot } from 'vjsc/components';
import styles from '../../styles/components/poster.styles';

export function Poster() {
  return (
    <$.Poster className={styles.root}>
      <Slot name="poster" />
    </$.Poster>
  );
}
