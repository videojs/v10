import type { StateAttrMap } from '../types';
import type { PlaybackRateMenuState } from './playback-rate-menu-core';

export const PlaybackRateMenuDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
  /** Present when playback rate selection is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<PlaybackRateMenuState>;
