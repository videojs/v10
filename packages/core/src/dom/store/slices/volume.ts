import type { InferSliceRequests, InferSliceState } from '@videojs/store';

import { createSlice } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

/**
 * Volume slice for HTMLMediaElement.
 *
 * Tracks volume and mute state, provides volume control.
 */
export const volumeSlice = createSlice<HTMLMediaElement>()({
  initialState: {
    /** Volume level from 0 (silent) to 1 (max). */
    volume: 1,
    /** Whether audio is muted. */
    muted: false,
  },

  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),

  subscribe: ({ target, update, signal }) => {
    const sync = () => update();
    listen(target, 'volumechange', sync, { signal });
  },

  request: {
    /** Set volume (clamped 0-1). Returns the clamped value. */
    changeVolume: (volume: number, { target }) => {
      target.volume = Math.max(0, Math.min(1, volume));
      return target.volume;
    },

    /** Toggle mute state. Returns new muted value. */
    toggleMute: (_, { target }) => {
      target.muted = !target.muted;
      return target.muted;
    },
  },
});

export type VolumeState = InferSliceState<typeof volumeSlice>;

export type VolumeRequests = InferSliceRequests<typeof volumeSlice>;
