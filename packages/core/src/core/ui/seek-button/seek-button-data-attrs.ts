import type { StateAttrMap } from '../types';
import type { SeekButtonState } from './seek-button-core';

export const SeekButtonDataAttrs = {
  /** Present when a seek is in progress. */
  seeking: 'data-seeking',
  /** Reflects the seconds offset value. */
  seconds: 'data-seconds',
} as const satisfies StateAttrMap<SeekButtonState>;
