import type { StateAttrMap } from '../types';
import type { AirPlayButtonState } from './airplay-button-core';

/** Maps AirPlayButtonState keys to the data attributes reflected on the button. */
export const AirPlayButtonDataAttrs = {
  state: 'data-airplay-state',
  availability: 'data-availability',
} as const satisfies StateAttrMap<AirPlayButtonState>;
