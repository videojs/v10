import { defineComponent } from 'vjsc/components';
import type { SliderValueProps } from '../slider/slider-component';
import type { SliderPreviewProps } from '../slider/slider-core';
import type { VolumeSliderProps } from './volume-slider-core';
import { VolumeSliderDataAttrs } from './volume-slider-data-attrs';

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
