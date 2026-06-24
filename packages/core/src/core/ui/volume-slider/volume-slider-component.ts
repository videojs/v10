import { defineComponent } from '../manifest';
import type { SliderValueProps } from '../slider/props';
import type { VolumeSliderProps } from './props';
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
