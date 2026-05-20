import type { StateAttrMap } from '../types';
import type { CastButtonState } from './cast-button-core';

/** Data attributes the cast button reflects from {@link CastButtonState}. */
export const CastButtonDataAttrs = {
  /** Current remote playback connection state. */
  castState: 'data-cast-state',
  /** Indicates cast availability (`available`, `unavailable`, or `unsupported`). */
  availability: 'data-availability',
} as const satisfies StateAttrMap<CastButtonState>;
