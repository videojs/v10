import { listen, onEvent } from '@videojs/utils/dom';
import { noop } from '@videojs/utils/function';
import type { MediaTimeState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';
import { hasMetadata, isMediaSeekCapable, isMediaSourceCapable } from '../../media/predicate';
import { signalKeys } from '../signal-keys';

export const timeFeature = definePlayerFeature({
  name: 'time',
  state: ({ target, signals, set }): MediaTimeState => ({
    currentTime: 0,
    duration: 0,
    seeking: false,
    async seek(time: number) {
      const { media } = target(),
        signal = signals.supersede(signalKeys.seek);

      if (!isMediaSeekCapable(media) || !isMediaSourceCapable(media)) return 0;

      if (!hasMetadata(media)) {
        const loaded = await onEvent(media, 'loadedmetadata', { signal }).catch(() => false);
        if (!loaded) return media.currentTime;
      }

      const clampedTime = Math.max(0, Math.min(time, media.duration || Infinity));

      set({ currentTime: clampedTime, seeking: true });

      media.currentTime = clampedTime;
      await onEvent(media, 'seeked', { signal }).catch(noop);

      return media.currentTime;
    },
  }),

  attach({ target, signal, set, get }) {
    const { media } = target;

    if (!isMediaSeekCapable(media)) return;

    const sync = () =>
      set({
        currentTime: media.currentTime,
        duration: Number.isFinite(media.duration) ? media.duration : 0,
        seeking: media.seeking,
      });

    // While a seek is in-flight the store holds an optimistic `currentTime`
    // that reflects the user's target position.  Browser `timeupdate` events
    // during seeking carry an unreliable intermediate value that would snap
    // the time-slider back to the old position, so skip `currentTime` sync
    // from `timeupdate` while the store indicates an active seek.
    const onTimeUpdate = () => {
      if (get().seeking) return;
      sync();
    };

    sync();

    listen(media, 'timeupdate', onTimeUpdate, { signal });
    listen(media, 'durationchange', sync, { signal });
    listen(media, 'seeking', sync, { signal });
    listen(media, 'seeked', sync, { signal });
    listen(media, 'loadedmetadata', sync, { signal });
    listen(media, 'emptied', sync, { signal });
  },
});
