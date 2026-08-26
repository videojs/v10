import { SliderDataAttrs } from '../slider/data';
import type { StateAttrMap } from '../types';
import type { VolumeSliderState } from './core';

export const VolumeSliderDataAttrs = {
  ...SliderDataAttrs,
  availability: 'data-availability',
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<VolumeSliderState>;
