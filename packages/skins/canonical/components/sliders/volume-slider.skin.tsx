import { VolumeSlider as VolumeSliderPrimitive } from '@videojs/core/components';

export interface VolumeSliderProps {
  orientation?: 'horizontal' | 'vertical' | undefined;
}

export function VolumeSlider({ orientation = 'horizontal' }: VolumeSliderProps = {}) {
  return (
    <VolumeSliderPrimitive.Root orientation={orientation} thumbAlignment="edge">
      <VolumeSliderPrimitive.Track>
        <VolumeSliderPrimitive.Fill />
      </VolumeSliderPrimitive.Track>
      <VolumeSliderPrimitive.Thumb />
    </VolumeSliderPrimitive.Root>
  );
}
