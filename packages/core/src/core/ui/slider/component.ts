import { defineComponent } from 'vjsc/components';

import type { ThumbnailImageProps, ThumbnailProps } from '../thumbnail/core';
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
    // The slider supplies `time` from its pointer value, so the root part never accepts it.
    Thumbnail: defineComponent({
      parts: {
        Root: defineComponent<Omit<ThumbnailProps, 'time'>>(),
        Image: defineComponent<ThumbnailImageProps>(),
      },
    }),
    Preview: defineComponent<SliderPreviewProps>(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: SliderDataAttrs,
});
