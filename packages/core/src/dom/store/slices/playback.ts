import type { InferSliceRequests, InferSliceState } from '@videojs/store';

import { createSlice } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

/**
 * Playback slice for HTMLMediaElement.
 *
 * Tracks core playback state and provides play/pause control.
 */
export const playbackSlice = createSlice<HTMLMediaElement>()({
  initialState: {
    /** Whether playback is paused. */
    paused: true,
    /** Whether playback has reached the end. */
    ended: false,
    /** Whether playback has started (played or seeked). */
    started: false,
    /** Whether playback is stalled waiting for data. */
    waiting: false,
  },

  getSnapshot: ({ target }) => ({
    paused: target.paused,
    ended: target.ended,
    started: !target.paused || target.currentTime > 0,
    waiting: target.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !target.paused,
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'play', update, { signal });
    listen(target, 'pause', update, { signal });
    listen(target, 'ended', update, { signal });
    listen(target, 'playing', update, { signal });
    listen(target, 'waiting', update, { signal });
  },

  request: {
    /** Start playback. Returns when playback begins. */
    play: async (_, { target }) => {
      await target.play();
    },

    /** Pause playback immediately. */
    pause: (_, { target }) => {
      target.pause();
    },
  },
});

export type PlaybackState = InferSliceState<typeof playbackSlice>;

export type PlaybackRequests = InferSliceRequests<typeof playbackSlice>;
