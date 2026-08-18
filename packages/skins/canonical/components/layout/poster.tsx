import { Poster as PosterPrimitive } from '@videojs/core/components';
import { Slot } from '@videojs/jsx';
import styles from '../../styles/components/poster.tailwind';

export function Poster() {
  return (
    <PosterPrimitive className={styles.poster}>
      <Slot name="poster" />
    </PosterPrimitive>
  );
}
