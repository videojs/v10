import './styles.css';
import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/react';
export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root className="vjs-slider-root" thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track className="vjs-slider-track">
        <VolumeSliderPrimitive.Fill className="vjs-slider-fill" />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className="vjs-slider-thumb" />
    </VolumeSliderPrimitive.Root>
  );
}
