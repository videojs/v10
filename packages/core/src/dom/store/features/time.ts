import type { InferSliceState } from '@videojs/store';
import { listen, onEvent } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';

export const timeFeature = definePlayerFeature({
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

export type TimeState = InferSliceState<typeof timeFeature>;
