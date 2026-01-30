import { listen } from '@videojs/utils/dom';
import { createFeature } from '../store';
import type { FeatureActions, FeatureState } from '../types';

export const playbackFeature = createFeature<{ media: HTMLMediaElement }>()(() => ({
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

  getSnapshot: ({ media }) => ({
    paused: media.paused,
    ended: media.ended,
    started: !media.paused || media.currentTime > 0,
    waiting: media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && !media.paused,
  }),

  subscribe: {
    media: ({ media }, update, signal) => {
      listen(media, 'play', update, { signal });
      listen(media, 'pause', update, { signal });
      listen(media, 'ended', update, { signal });
      listen(media, 'playing', update, { signal });
      listen(media, 'waiting', update, { signal });
      listen(media, 'emptied', update, { signal });
    },
  },

  actions: ({ media }) => ({
    play() {
      return media.play();
    },
    pause() {
      media.pause();
    },
  }),
}));

export type PlaybackState = FeatureState<typeof playbackFeature>;
export type PlaybackActions = FeatureActions<typeof playbackFeature>;
