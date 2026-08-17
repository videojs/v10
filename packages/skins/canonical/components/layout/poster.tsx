import { Poster as PosterPrimitive } from '@videojs/core/components';
import { Slot } from '@videojs/jsx';
import styles from '../../styles/components/poster.styles';

export function Poster() {
  return (
    <PosterPrimitive className={styles.root}>
      <Slot name="poster" />
    </PosterPrimitive>
  );
}
