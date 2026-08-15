import { defineComponent } from '@videojs/jsx';
import type { SliderProps } from './slider-core';
import { SliderDataAttrs } from './slider-data-attrs';

export interface SliderValueProps {
  /** Which slider value to display. */
  type?: 'current' | 'pointer' | undefined;
  /** Custom formatter for the displayed value. */
  format?: ((value: number) => string) | undefined;
}

export interface SliderPreviewProps {
  /** Whether the preview is clamped to the slider bounds. */
  overflow?: 'clamp' | 'visible' | undefined;
}

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
    Preview: defineComponent<SliderPreviewProps>(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: SliderDataAttrs,
});
