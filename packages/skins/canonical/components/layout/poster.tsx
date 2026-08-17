import { Slot } from '@videojs/compiler/components';
import * as $ from '@videojs/core/components';
import styles from '../../styles/components/poster.styles';

export function Poster() {
  return (
    <$.Poster className={styles.root}>
      <Slot name="poster" />
    </$.Poster>
  );
}
