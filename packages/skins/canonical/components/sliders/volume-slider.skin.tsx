import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/core/components';
import { slider, sliderFill, sliderThumb, sliderTrack } from '../../styles/components/slider.tailwind';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root className={slider} thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track className={sliderTrack}>
        <VolumeSliderPrimitive.Fill className={sliderFill} />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className={sliderThumb} />
    </VolumeSliderPrimitive.Root>
  );
}
