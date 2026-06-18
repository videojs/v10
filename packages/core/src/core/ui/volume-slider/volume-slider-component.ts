import { defineComponent } from '@videojs/compiler';
import type { VolumeSliderProps } from './volume-slider-core';
import { VolumeSliderDataAttrs } from './volume-slider-data-attrs';

export default defineComponent<VolumeSliderProps>()({
  name: 'VolumeSlider',
  parts: ['Root', 'Track', 'Fill', 'Thumb', 'Preview', 'Value'] as const,
  dataAttrs: VolumeSliderDataAttrs,
});
