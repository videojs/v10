import type { InferFeatureState } from '@videojs/store';

import { defineFeature } from '@videojs/store';
import { listen, onEvent } from '@videojs/utils/dom';

export const timeFeature = defineFeature<HTMLMediaElement>()({
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
          target.currentTime = time;
          await onEvent(target, 'seeked', { signal });
          return target.currentTime; // actual position after seek
        },
      });
    },
  }),

  getSnapshot: ({ target }) => ({
    currentTime: target.currentTime,
    duration: target.duration || 0,
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'timeupdate', update, { signal });
    listen(target, 'durationchange', update, { signal });
    listen(target, 'seeked', update, { signal });
    listen(target, 'loadedmetadata', update, { signal });
    listen(target, 'emptied', update, { signal });
  },
});

export type TimeState = InferFeatureState<typeof timeFeature>;
