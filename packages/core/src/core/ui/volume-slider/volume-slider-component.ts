import { defineComponent } from 'vjsc/components';

import type { SliderPreviewProps } from '../slider/core';
import type { SliderValueProps } from '../slider/slider-component';
import type { VolumeSliderProps } from './core';
import { VolumeSliderDataAttrs } from './data';

export default defineComponent({
  name: 'VolumeSlider',
  root: 'Root',
  parts: {
    Root: defineComponent<VolumeSliderProps>(),
    Track: defineComponent(),
    Fill: defineComponent(),
    Thumb: defineComponent(),
    Preview: defineComponent<SliderPreviewProps>(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: VolumeSliderDataAttrs,
});
