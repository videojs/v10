import type { StateAttrMap } from '../types';
import type { PlaybackRateButtonState } from './core';

export const PlaybackRateButtonDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
} as const satisfies StateAttrMap<PlaybackRateButtonState>;
