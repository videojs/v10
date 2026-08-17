import type { VolumeSliderProps } from '@videojs/core';
import * as $ from '@videojs/core/components';
import styles from '../../styles/components/slider.styles';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <$.VolumeSlider.Root className={styles.root} thumbAlignment="edge" {...props}>
      <$.VolumeSlider.Track className={styles.track}>
        <$.VolumeSlider.Fill className={styles.fill} />
      </$.VolumeSlider.Track>
      <$.VolumeSlider.Thumb className={[styles.thumb, styles.persistentThumb]} />
    </$.VolumeSlider.Root>
  );
}
