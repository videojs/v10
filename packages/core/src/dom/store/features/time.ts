import type { InferFeatureRequests, InferFeatureState } from '@videojs/store';

import { createFeature } from '@videojs/store';
import { listen, onEvent } from '@videojs/utils/dom';

/**
 * Time feature for HTMLMediaElement.
 *
 * Tracks current time and duration, provides seek control.
 */
export const timeFeature = createFeature<HTMLMediaElement>()({
  initialState: {
    /** Current playback position in seconds. */
    currentTime: 0,
    /** Total duration in seconds (0 if unknown). */
    duration: 0,
  },

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

  request: {
    /** Seek to a time in seconds. Returns the requested time. */
    seek: async (time: number, { target, signal }) => {
      target.currentTime = time;
      await onEvent(target, 'seeked', { signal });
      return target.currentTime; // actual position after seek
    },
  },
});

export type TimeState = InferFeatureState<typeof timeFeature>;

export type TimeRequests = InferFeatureRequests<typeof timeFeature>;
