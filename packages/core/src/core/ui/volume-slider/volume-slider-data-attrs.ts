import { SliderDataAttrs } from '../slider/slider-data-attrs';
import type { StateAttrMap } from '../types';
import type { VolumeSliderState } from './volume-slider-core';

/** Data attributes the volume slider reflects from {@link VolumeSliderState}. */
export const VolumeSliderDataAttrs = {
  ...SliderDataAttrs,
  /** Whether the platform supports volume control. */
  availability: 'data-availability',
} as const satisfies StateAttrMap<VolumeSliderState>;
