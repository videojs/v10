import type { StateAttrMap } from '../types';
import type { CaptionsButtonState } from './captions-button-core';

export const CaptionsButtonDataAttrs = {
  /** Present when captions are enabled. */
  subtitlesShowing: 'data-subtitles-showing',
} as const satisfies StateAttrMap<CaptionsButtonState>;
