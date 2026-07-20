import type { StateAttrMap } from '../types';
import type { AudioTrackRadioGroupState } from './audio-track-radio-group-core';

export const AudioTrackRadioGroupDataAttrs = {
  /** Current audio track value. */
  value: 'data-audio-track',
  /** Present when audio track selection is disabled. */
  disabled: 'data-disabled',
  /** Indicates audio track availability (`available` or `unavailable`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<AudioTrackRadioGroupState>;
