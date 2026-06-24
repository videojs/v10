import { defineComponent } from '../manifest';
import type { SliderValueProps } from '../slider/props';
import type { TimeSliderProps } from './props';
import { TimeSliderDataAttrs } from './time-slider-data-attrs';

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
