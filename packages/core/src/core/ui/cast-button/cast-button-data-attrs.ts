import type { StateAttrMap } from '../types';
import type { CastButtonState } from './cast-button-core';

export const CastButtonDataAttrs = {
  /** Indicates the current cast connection (`disconnected`, `connecting`, `connected`). */
  castState: 'data-cast-state',
  /** Indicates cast availability (`available`, `unavailable`, `unsupported`). */
  availability: 'data-availability',
  /** Present when the button is non-interactive (mirrors `aria-disabled`). */
  disabled: 'data-disabled',
  /** Present when the button is hidden because the feature is unsupported. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<CastButtonState>;
