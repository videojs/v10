import { defineComponent } from '../manifest';
import type { SliderProps } from './slider-core';
import { SliderDataAttrs } from './slider-data-attrs';

export default defineComponent<SliderProps>()({
  name: 'Slider',
  parts: ['Root', 'Track', 'Fill', 'Buffer', 'Thumb', 'Thumbnail', 'Preview', 'Value'] as const,
  dataAttrs: SliderDataAttrs,
});
