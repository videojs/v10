import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/core/components';
import styles from '../../styles/components/slider.styles';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root className={styles.root} thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track className={styles.track}>
        <VolumeSliderPrimitive.Fill className={styles.fill} />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className={[styles.thumb, styles.persistentThumb]} />
    </VolumeSliderPrimitive.Root>
  );
}
