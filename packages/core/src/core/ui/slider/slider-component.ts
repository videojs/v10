import { defineComponent, defineComponentPart, defineComponentPartGroup } from '../manifest';
import type { SliderProps, SliderValueProps } from './props';
import { SliderDataAttrs } from './slider-data-attrs';

export default defineComponent()({
  name: 'Slider',
  parts: {
    Root: defineComponentPart<SliderProps>(),
    Track: defineComponentPart(),
    Fill: defineComponentPart(),
    Buffer: defineComponentPart(),
    Thumb: defineComponentPart(),
    Thumbnail: defineComponentPartGroup({
      Root: defineComponentPart(),
      Image: defineComponentPart(),
    }),
    Preview: defineComponentPart(),
    Value: defineComponentPart<SliderValueProps>(),
  },
  dataAttrs: SliderDataAttrs,
});
