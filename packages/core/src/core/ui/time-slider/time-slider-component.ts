import { defineComponent } from '../manifest';
import type { TimeSliderProps } from './time-slider-core';
import { TimeSliderDataAttrs } from './time-slider-data-attrs';

export default defineComponent<TimeSliderProps>()({
  name: 'TimeSlider',
  parts: ['Root', 'Track', 'Fill', 'Buffer', 'Thumb', 'Preview', 'Value'] as const,
  dataAttrs: TimeSliderDataAttrs,
});
