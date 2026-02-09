import type { StateAttrMap } from '../types';
import type { TimeState } from './time-core';

export const TimeDataAttrs = {
  /** The type of time being displayed. */
  type: 'data-type',
} as const satisfies StateAttrMap<TimeState>;
