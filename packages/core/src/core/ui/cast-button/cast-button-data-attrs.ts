import type { StateAttrMap } from '../types';
import type { CastButtonState } from './cast-button-core';

export const CastButtonDataAttrs = {
  /** Indicates cast connection state (`disconnected`, `connecting`, or `connected`). */
  castState: 'data-cast-state',
  /** Indicates cast availability (`available`, `unavailable`, or `unsupported`). */
  availability: 'data-availability',
  /** Present when the button is non-interactive (explicitly disabled or feature not available). */
  disabled: 'data-disabled',
  /** Present when the feature is unsupported. */
  hidden: 'data-hidden',
} as const satisfies StateAttrMap<CastButtonState>;
