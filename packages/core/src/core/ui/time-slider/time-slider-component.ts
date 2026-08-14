import { defineComponent } from '@videojs/jsx';
import type { SliderValueProps } from '../slider/slider-component';
import type { TimeSliderProps } from './core';
import { TimeSliderDataAttrs } from './data';

export default defineComponent({
  name: 'TimeSlider',
  parts: {
    Root: defineComponent<TimeSliderProps>(),
    Track: defineComponent(),
    Fill: defineComponent(),
    Buffer: defineComponent(),
    Thumb: defineComponent(),
    Preview: defineComponent(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: TimeSliderDataAttrs,
});
