import type { StateAttrMap } from '../types';
import type { MuteButtonState } from './mute-button-core';

/** Data attributes the mute button reflects from {@link MuteButtonState}. */
export const MuteButtonDataAttrs = {
  /** Present when the media is muted. */
  muted: 'data-muted',
  /** Indicates the volume level. */
  volumeLevel: 'data-volume-level',
} as const satisfies StateAttrMap<MuteButtonState>;
