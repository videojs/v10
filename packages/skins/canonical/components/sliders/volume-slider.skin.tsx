import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/core/components';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track>
        <VolumeSliderPrimitive.Fill />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb />
    </VolumeSliderPrimitive.Root>
  );
}
