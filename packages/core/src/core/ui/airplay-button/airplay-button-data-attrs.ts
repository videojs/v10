import type { StateAttrMap } from '../types';
import type { AirplayButtonState } from './airplay-button-core';

/** Maps AirplayButtonState keys to the data attributes reflected on the button. */
export const AirplayButtonDataAttrs = {
  state: 'data-airplay-state',
  availability: 'data-availability',
} as const satisfies StateAttrMap<AirplayButtonState>;
