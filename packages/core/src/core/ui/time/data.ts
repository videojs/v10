import type { StateAttrMap } from '../types';
import type { TimeState } from './core';

export const TimeDataAttrs = {
  /** The type of time being displayed. */
  type: 'data-type',
  /** Present when the time value is unavailable. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<TimeState>;
