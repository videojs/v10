import type { VolumeSliderProps } from '@videojs/core';
import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/core/components';
import { slider } from '../../styles/components/slider.tailwind';

export function VolumeSlider(props: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root className={slider.root} thumbAlignment="edge" {...props}>
      <VolumeSliderPrimitive.Track className={slider.track}>
        <VolumeSliderPrimitive.Fill className={[slider.fillBase, slider.fill]} />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb className={slider.thumb} />
    </VolumeSliderPrimitive.Root>
  );
}
