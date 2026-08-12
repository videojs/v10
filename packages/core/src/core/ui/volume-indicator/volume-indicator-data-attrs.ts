import type { StateAttrMap } from '../types';
import type { VolumeIndicatorState } from './volume-indicator-core';

export const VolumeIndicatorDataAttrs = {
  open: 'data-open',
  level: 'data-level',
  min: 'data-min',
  max: 'data-max',
  transitionStarting: 'data-starting-style',
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<VolumeIndicatorState>;
