import type { InferFeatureState } from '@videojs/store';

import { defineFeature } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

export const playbackFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task }) => ({
    /** Whether playback is paused. */
    paused: true,
    /** Whether playback has reached the end. */
    ended: false,
    /** Whether playback has started (played or seeked). */
    started: false,
    /** Whether playback is stalled waiting for data. */
    waiting: false,

    /** Start playback. Returns when playback begins. */
    play() {
      return task({
        key: 'playback',
        mode: 'shared',
        async handler({ target }) {
          await target.play();
        },
      });
    },

    /** Pause playback immediately. */
    pause() {
      return task({
        key: 'playback',
        handler({ target }) {
          target.pause();
        },
      });
    },
  }),

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
});

export type PlaybackState = InferFeatureState<typeof playbackFeature>;
