import { defineComponent } from 'vjsc/components';

import type { SliderPreviewProps } from '../slider/core';
import type { SliderValueProps } from '../slider/slider-component';
import type { TimeSliderProps } from './core';
import { TimeSliderDataAttrs } from './data';

export default defineComponent({
  name: 'TimeSlider',
  root: 'Root',
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
