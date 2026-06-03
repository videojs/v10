import type { StateAttrMap } from '../types';
import type { CastButtonState } from './cast-button-core';

export const CastButtonDataAttrs = {
  /**
   * Current remote playback connection state.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback/state
   */
  castState: 'data-cast-state',
  /**
   * Whether remote playback can be requested on this platform.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RemotePlayback
   */
  availability: 'data-availability',
} as const satisfies StateAttrMap<CastButtonState>;
