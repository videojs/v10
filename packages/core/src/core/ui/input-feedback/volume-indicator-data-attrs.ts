import type { StateAttrMap } from '../types';
import type { VolumeIndicatorState } from './volume-indicator-core';

/** Data attributes the volume indicator reflects from {@link VolumeIndicatorState}. */
export const VolumeIndicatorDataAttrs = {
  /** Present when the indicator is open. */
  open: 'data-open',
  /** Current volume bucket (`off`, `low`, or `high`). */
  level: 'data-level',
  /** Present when the user just attempted to lower volume past 0. */
  min: 'data-min',
  /** Present when the user just attempted to raise volume past 1. */
  max: 'data-max',
  /** Present at the start of an enter transition. */
  transitionStarting: 'data-starting-style',
  /** Present at the start of an exit transition. */
  transitionEnding: 'data-ending-style',
} as const satisfies StateAttrMap<VolumeIndicatorState>;
