import type { StateAttrMap } from '../types';
import type { AirplayButtonState } from './airplay-button-core';

export const AirplayButtonDataAttrs = {
  airplayState: 'data-airplay-state',
  availability: 'data-availability',
} as const satisfies StateAttrMap<AirplayButtonState>;
