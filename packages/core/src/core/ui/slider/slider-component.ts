import { defineComponent } from 'vjsc/components';

import type { SliderPreviewProps, SliderProps } from './core';
import { SliderDataAttrs } from './data';

export interface SliderValueProps {
  /** Which slider value to display. */
  type?: 'current' | 'pointer' | undefined;
  /** Custom formatter for the displayed value. */
  format?: ((value: number) => string) | undefined;
}

export default defineComponent({
  name: 'Slider',
  root: 'Root',
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
    Preview: defineComponent<SliderPreviewProps>(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: SliderDataAttrs,
});
