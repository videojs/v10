import { SliderDataAttrs } from '../slider/slider-data-attrs';
import type { StateAttrMap } from '../types';
import type { VolumeSliderState } from './volume-slider-core';

export const VolumeSliderDataAttrs = {
  ...SliderDataAttrs,
  /** Indicates volume availability (`available`, `unavailable`, or `unsupported`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<VolumeSliderState>;
