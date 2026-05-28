import type { StateAttrMap } from '../types';
import type { PlaybackRateRadioGroupState } from './playback-rate-radio-group-core';

export const PlaybackRateRadioGroupDataAttrs = {
  /** Current playback rate. */
  rate: 'data-rate',
  /** Present when playback rate selection is disabled. */
  disabled: 'data-disabled',
  /** Indicates playback rate availability (`available` or `unavailable`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<PlaybackRateRadioGroupState>;
