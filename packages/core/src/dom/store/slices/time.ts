import type { InferSliceRequests, InferSliceState } from '@videojs/store';

import { createSlice } from '@videojs/store';
import { listen, onEvent } from '@videojs/utils/dom';

/**
 * Time slice for HTMLMediaElement.
 *
 * Tracks current time and duration, provides seek control.
 */
export const timeSlice = createSlice<HTMLMediaElement>()({
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
    const sync = () => update();
    listen(target, 'timeupdate', sync, { signal });
    listen(target, 'durationchange', sync, { signal });
    listen(target, 'seeked', sync, { signal });
    listen(target, 'loadedmetadata', sync, { signal });
    listen(target, 'emptied', sync, { signal });
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

export type TimeState = InferSliceState<typeof timeSlice>;

export type TimeRequests = InferSliceRequests<typeof timeSlice>;
