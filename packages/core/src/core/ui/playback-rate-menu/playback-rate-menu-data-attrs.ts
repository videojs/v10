import type { StateAttrMap } from '../types';
import type { PlaybackRateMenuState } from './playback-rate-menu-core';

/** Data attributes the playback rate menu reflects from {@link PlaybackRateMenuState}. */
export const PlaybackRateMenuDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
  /** Present when playback rate selection is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<PlaybackRateMenuState>;
