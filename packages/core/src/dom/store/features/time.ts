import type { InferFeatureState } from '@videojs/store';

import { defineFeature } from '@videojs/store';
import { listen, onEvent } from '@videojs/utils/dom';

import type { PlayerTarget } from '../../types';

export const timeFeature = defineFeature<PlayerTarget>()({
  state: ({ task }) => ({
    /** Current playback position in seconds. */
    currentTime: 0,
    /** Total duration in seconds (0 if unknown). */
    duration: 0,

    /** Seek to a time in seconds. Returns the requested time. */
    seek(time: number) {
      return task({
        key: 'seek',
        async handler({ target, signal }) {
          target.media.currentTime = time;
          await onEvent(target.media, 'seeked', { signal });
          return target.media.currentTime; // actual position after seek
        },
      });
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () =>
      set({
        currentTime: media.currentTime,
        duration: media.duration || 0,
      });

    sync();

    listen(media, 'timeupdate', sync, { signal });
    listen(media, 'durationchange', sync, { signal });
    listen(media, 'seeked', sync, { signal });
    listen(media, 'loadedmetadata', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});

export type TimeState = InferFeatureState<typeof timeFeature>;
