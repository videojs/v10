import type { StateAttrMap } from '../types';
import { SliderDataAttrs } from './slider-data-attrs';
import type { TimeSliderState } from './time-slider-core';

export const TimeSliderDataAttrs = {
  ...SliderDataAttrs,
  /** Present when a seek operation is in progress. */
  seeking: 'data-seeking',
} as const satisfies StateAttrMap<TimeSliderState>;
