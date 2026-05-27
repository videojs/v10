import type { StateAttrMap } from '../types';
import type { PlaybackRateOptionsState } from './playback-rate-options-core';

export const PlaybackRateOptionsDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
  /** Present when playback rate selection is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<PlaybackRateOptionsState>;
