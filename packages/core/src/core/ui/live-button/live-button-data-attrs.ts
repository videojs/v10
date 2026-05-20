import type { StateAttrMap } from '../types';
import type { LiveButtonState } from './live-button-core';

/** Data attributes the live button reflects from {@link LiveButtonState}. */
export const LiveButtonDataAttrs = {
  /** Present when the stream is live (or DVR). */
  live: 'data-live',
  /** Present when playback is at the live edge. */
  liveEdge: 'data-live-edge',
} as const satisfies StateAttrMap<LiveButtonState>;
