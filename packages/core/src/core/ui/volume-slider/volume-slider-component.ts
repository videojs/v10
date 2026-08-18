import { defineComponent } from '@videojs/jsx';
import type { SliderValueProps } from '../slider/slider-component';
import type { VolumeSliderProps } from './volume-slider-core';
import { VolumeSliderDataAttrs } from './volume-slider-data-attrs';

export default defineComponent({
  name: 'VolumeSlider',
  parts: {
    Root: defineComponent<VolumeSliderProps>(),
    Track: defineComponent(),
    Fill: defineComponent(),
    Thumb: defineComponent(),
    Preview: defineComponent(),
    Value: defineComponent<SliderValueProps>(),
  },
  dataAttrs: VolumeSliderDataAttrs,
});
