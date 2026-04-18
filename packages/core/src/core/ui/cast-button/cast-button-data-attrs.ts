import type { StateAttrMap } from '../types';
import type { CastButtonState } from './cast-button-core';

export const CastButtonDataAttrs = {
  castState: 'data-cast-state',
  availability: 'data-availability',
  available: 'data-available',
} as const satisfies StateAttrMap<CastButtonState>;
