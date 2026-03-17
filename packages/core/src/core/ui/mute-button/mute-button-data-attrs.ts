import type { StateAttrMap } from '../types';
import type { MuteButtonState } from './mute-button-core';

export const MuteButtonDataAttrs = {
  /** Indicates whether volume control is available. */
  availability: 'data-availability',
  /** Present when the media is muted. */
  muted: 'data-muted',
  /** Indicates the volume level. */
  volumeLevel: 'data-volume-level',
} as const satisfies StateAttrMap<MuteButtonState>;
