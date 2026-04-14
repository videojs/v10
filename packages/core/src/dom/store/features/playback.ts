import { listen } from '@videojs/utils/dom';

import type { MediaPlaybackState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { isMediaPauseCapable, isMediaSeekCapable, isMediaSourceCapable } from '../../media/predicate';

export const playbackFeature = definePlayerFeature({
  name: 'playback',
  state: ({ target }): MediaPlaybackState => ({
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play() {
      return target().media.play();
    },
    pause() {
      const { media } = target();
      if (isMediaPauseCapable(media)) media.pause();
    },
    togglePaused() {
      const media = target().media;
      if (!isMediaPauseCapable(media)) return false;
      if (media.paused) {
        media.play();
        return true;
      }
      media.pause();
      return false;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaPauseCapable(media) || !isMediaSeekCapable(media) || !isMediaSourceCapable(media)) return;

    const sync = () =>
      set({
        paused: media.paused,
        ended: media.ended,
        started: !media.paused || media.currentTime > 0,
        waiting: media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !media.paused,
      });

    sync();

    listen(media, 'emptied', sync, { signal });
    listen(media, 'play', sync, { signal });
    listen(media, 'pause', sync, { signal });
    listen(media, 'ended', sync, { signal });
    listen(media, 'playing', sync, { signal });
    listen(media, 'waiting', sync, { signal });
    listen(media, 'seeked', sync, { signal });
  },
});
