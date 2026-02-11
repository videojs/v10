import { listen } from '@videojs/utils/dom';

import type { MediaPlaybackState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const playbackFeature = definePlayerFeature({
  state: ({ target }): MediaPlaybackState => ({
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play() {
      return target().media.play();
    },
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
