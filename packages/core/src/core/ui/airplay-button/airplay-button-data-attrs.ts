import type { StateAttrMap } from '../types';
import type { AirPlayButtonState } from './airplay-button-core';

export const AirPlayButtonDataAttrs = {
  /**
   * Current AirPlay connection state.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback/state
   */
  state: 'data-airplay-state',
  /**
   * Whether AirPlay is available on the active platform and media.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback
   */
  availability: 'data-availability',
} as const satisfies StateAttrMap<AirPlayButtonState>;
