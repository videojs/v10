import type { InferFeatureRequests, InferFeatureState } from '@videojs/store';

import { createFeature } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

/**
 * Playback feature for HTMLMediaElement.
 *
 * Tracks core playback state and provides play/pause control.
 */
export const playbackFeature = createFeature<HTMLMediaElement>()({
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

export type PlaybackState = InferFeatureState<typeof playbackFeature>;

export type PlaybackRequests = InferFeatureRequests<typeof playbackFeature>;
