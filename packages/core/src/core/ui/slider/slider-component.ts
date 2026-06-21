import { defineComponent, defineComponentPart } from '../manifest';
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
    Thumbnail: defineComponentPart(),
    Preview: defineComponentPart(),
    Value: defineComponentPart<SliderValueProps>(),
  },
  dataAttrs: SliderDataAttrs,
});
