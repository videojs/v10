import type { StateAttrMap } from '../types';
import type { CastButtonState } from './cast-button-core';

export const CastButtonDataAttrs = {
  /** Indicates cast connection state (`disconnected`, `connecting`, or `connected`). */
  castState: 'data-cast-state',
  /** Indicates cast availability (`available`, `unavailable`, or `unsupported`). */
  availability: 'data-availability',
  /** Present when casting is available. */
  available: 'data-available',
} as const satisfies StateAttrMap<CastButtonState>;
