import { defineComponent } from '../manifest';
import type { SliderProps, SliderValueProps } from './props';
import { SliderDataAttrs } from './slider-data-attrs';

export default defineComponent({
  name: 'Slider',
  parts: {
    Root: defineComponent<SliderProps>(),
    Track: defineComponent(),
    Fill: defineComponent(),
    Buffer: defineComponent(),
    Thumb: defineComponent(),
    Thumbnail: defineComponent({
      parts: {
        Root: defineComponent(),
        Image: defineComponent(),
      },
    }),
    Preview: defineComponent(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: SliderDataAttrs,
});
