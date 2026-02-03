import type { InferSliceState } from '@videojs/store';
import { listen, onEvent } from '@videojs/utils/dom';
import { noop } from '@videojs/utils/function';
import { definePlayerFeature } from '../../feature';
import { hasMetadata } from '../../media/predicate';

export const timeFeature = definePlayerFeature({
  state: ({ target, signal }) => {
    let abort: AbortController | null = null;

    const supersede = () => {
      abort?.abort();
      abort = new AbortController();
      return AbortSignal.any([signal(), abort.signal]);
    };

    return {
      /** Current playback position in seconds. */
      currentTime: 0,
      /** Total duration in seconds (0 if unknown). */
      duration: 0,
      /** Whether a seek operation is in progress. */
      seeking: false,
      /** Seek to a time in seconds. Returns the actual position after seek. */
      async seek(time: number) {
        const { media } = target(),
          signal = supersede();

        // If metadata isn't loaded, wait for it before seeking to avoid errors.
        if (!hasMetadata(media)) {
          const loaded = await onEvent(media, 'loadedmetadata', { signal }).catch(() => false);
          if (!loaded) return media.currentTime;
        }

        // Perform the seek and wait for it to complete.
        const clampedTime = Math.max(0, Math.min(time, media.duration || Infinity));
        media.currentTime = clampedTime;
        await onEvent(media, 'seeked', { signal }).catch(noop);

        return media.currentTime;
      },
    };
  },

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () =>
      set({
        currentTime: media.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : 0,
        seeking: media.seeking,
      });

    sync();

    listen(media, 'timeupdate', sync, { signal });
    listen(media, 'durationchange', sync, { signal });
    listen(media, 'seeking', sync, { signal });
    listen(media, 'seeked', sync, { signal });
    listen(media, 'loadedmetadata', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});

export type TimeState = InferSliceState<typeof timeFeature>;
