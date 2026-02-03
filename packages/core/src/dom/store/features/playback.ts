import type { InferSliceState } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';

export const playbackFeature = definePlayerFeature({
  state: ({ target }) => ({
    /** Whether playback is paused. */
    paused: true,
    /** Whether playback has reached the end. */
    ended: false,
    /** Whether playback has started (played or seeked). */
    started: false,
    /** Whether playback is stalled waiting for data. */
    waiting: false,
    /** Start playback. */
    play() {
      return target().media.play();
    },
    /** Pause playback immediately. */
    pause() {
      target().media.pause();
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () =>
      set({
        paused: media.paused,
        ended: media.ended,
        started: !media.paused || media.currentTime > 0,
        waiting: media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !media.paused,
      });

    sync();

    listen(media, 'play', sync, { signal });
    listen(media, 'pause', sync, { signal });
    listen(media, 'ended', sync, { signal });
    listen(media, 'playing', sync, { signal });
    listen(media, 'waiting', sync, { signal });
  },
});

export type PlaybackState = InferSliceState<typeof playbackFeature>;
