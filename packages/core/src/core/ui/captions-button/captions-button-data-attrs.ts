import type { StateAttrMap } from '../types';
import type { CaptionsButtonState } from './captions-button-core';

/** Data attributes the captions button reflects from {@link CaptionsButtonState}. */
export const CaptionsButtonDataAttrs = {
  /** Present when captions are enabled. */
  subtitlesShowing: 'data-active',
  /** Indicates captions availability (`available` or `unavailable`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<CaptionsButtonState>;
