import { defineComponent } from '@videojs/jsx';
import type { SliderPreviewProps, SliderValueProps } from '../slider/slider-component';
import type { TimeSliderProps } from './time-slider-core';
import { TimeSliderDataAttrs } from './time-slider-data-attrs';

export default defineComponent({
  name: 'TimeSlider',
  parts: {
    Root: defineComponent<TimeSliderProps>(),
    Track: defineComponent(),
    Fill: defineComponent(),
    Buffer: defineComponent(),
    Thumb: defineComponent(),
    Chapters: defineComponent(),
    ChapterTitle: defineComponent(),
    Preview: defineComponent<SliderPreviewProps>(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: TimeSliderDataAttrs,
});
