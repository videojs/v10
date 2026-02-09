import { listen, onEvent } from '@videojs/utils/dom';
import { noop } from '@videojs/utils/function';
import type { MediaTimeState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { hasMetadata } from '../../media/predicate';
import { signalKeys } from '../signal-keys';

export const timeFeature = definePlayerFeature({
  state: ({ target, signals }): MediaTimeState => ({
    currentTime: 0,
    duration: 0,
    seeking: false,
    async seek(time: number) {
      const { media } = target(),
        signal = signals.supersede(signalKeys.seek);

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
  }),

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
