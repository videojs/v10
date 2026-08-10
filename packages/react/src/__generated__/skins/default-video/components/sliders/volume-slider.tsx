import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@/ui/volume-slider';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root className="media-slider" thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track className="media-slider-track">
        <VolumeSliderPrimitive.Fill className="media-slider-fill" />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className="media-slider-thumb" />
    </VolumeSliderPrimitive.Root>
  );
}
