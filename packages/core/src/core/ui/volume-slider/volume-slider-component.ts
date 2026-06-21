import { defineComponent, defineComponentPart } from '../manifest';
import type { SliderValueProps } from '../slider/props';
import type { VolumeSliderProps } from './props';
import { VolumeSliderDataAttrs } from './volume-slider-data-attrs';

export default defineComponent()({
  name: 'VolumeSlider',
  parts: {
    Root: defineComponentPart<VolumeSliderProps>(),
    Track: defineComponentPart(),
    Fill: defineComponentPart(),
    Thumb: defineComponentPart(),
    Preview: defineComponentPart(),
    Value: defineComponentPart<SliderValueProps>(),
  },
  dataAttrs: VolumeSliderDataAttrs,
});
