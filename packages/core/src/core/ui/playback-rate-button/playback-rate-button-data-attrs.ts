import type { StateAttrMap } from '../types';
import type { PlaybackRateButtonState } from './playback-rate-button-core';

/** Data attributes the playback rate button reflects from {@link PlaybackRateButtonState}. */
export const PlaybackRateButtonDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
} as const satisfies StateAttrMap<PlaybackRateButtonState>;
