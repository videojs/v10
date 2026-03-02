import { SliderDataAttrs } from '../slider/slider-data-attrs';
import type { StateAttrMap } from '../types';
import type { VolumeSliderState } from './volume-slider-core';

export const VolumeSliderDataAttrs = {
  ...SliderDataAttrs,
} as const satisfies StateAttrMap<VolumeSliderState>;
