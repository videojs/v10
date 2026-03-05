import type { StateAttrMap } from '../types';
import type { PlaybackRateButtonState } from './playback-rate-button-core';

export const PlaybackRateButtonDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
} as const satisfies StateAttrMap<PlaybackRateButtonState>;
