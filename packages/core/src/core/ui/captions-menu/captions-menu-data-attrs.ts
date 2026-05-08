import type { StateAttrMap } from '../types';
import type { CaptionsMenuState } from './captions-menu-core';

export const CaptionsMenuDataAttrs = {
  /** Present when captions are enabled. */
  subtitlesShowing: 'data-active',
  /** Indicates captions availability (`available` or `unavailable`). */
  availability: 'data-availability',
  /** Present when captions selection is disabled. */
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<CaptionsMenuState>;
