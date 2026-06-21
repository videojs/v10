import { defineComponent, defineComponentPart } from '../manifest';
import type { SliderValueProps } from '../slider/props';
import type { TimeSliderProps } from './props';
import { TimeSliderDataAttrs } from './time-slider-data-attrs';

export default defineComponent()({
  name: 'TimeSlider',
  parts: {
    Root: defineComponentPart<TimeSliderProps>(),
    Track: defineComponentPart(),
    Fill: defineComponentPart(),
    Buffer: defineComponentPart(),
    Thumb: defineComponentPart(),
    Preview: defineComponentPart(),
    Value: defineComponentPart<SliderValueProps>(),
  },
  dataAttrs: TimeSliderDataAttrs,
});
