import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/core/components';
import styles from '../../styles/components/slider.tailwind';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root className={styles.slider} thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track className={styles.sliderTrack}>
        <VolumeSliderPrimitive.Fill className={styles.sliderFill} />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className={styles.sliderThumb} />
    </VolumeSliderPrimitive.Root>
  );
}
