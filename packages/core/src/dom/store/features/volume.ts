import { listen } from '@videojs/utils/dom';

import type { MediaFeatureAvailability, MediaVolumeState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

/** Volume to restore when unmuting at zero. */
const UNMUTE_VOLUME = 0.25;

export const volumeFeature = definePlayerFeature({
  name: 'volume',
  state: ({ target }): MediaVolumeState => ({
    volume: 1,
    muted: false,
    volumeAvailability: 'unavailable',

    setVolume(volume: number) {
      const { media } = target();
      const clamped = Math.max(0, Math.min(1, volume));

      // Auto-unmute when raising volume above zero.
      if (clamped > 0 && media.muted) {
        media.muted = false;
      }

      media.volume = clamped;
      return media.volume;
    },

    toggleMuted() {
      const { media } = target();
      const willUnmute = media.muted;
      media.muted = !media.muted;

      // Restore a sensible volume when unmuting at zero.
      if (willUnmute && media.volume === 0) {
        media.volume = UNMUTE_VOLUME;
      }

      return media.muted;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    set({ volumeAvailability: canSetVolume() });

    const sync = () => set({ volume: media.volume, muted: media.muted });
    sync();

    listen(media, 'volumechange', sync, { signal });
  },
});

/** Check if volume can be programmatically set (fails on iOS Safari). */
function canSetVolume(): MediaFeatureAvailability {
  const video = document.createElement('video');
  try {
    video.volume = 0.5;
    return video.volume === 0.5 ? 'available' : 'unsupported';
  } catch {
    return 'unsupported';
  }
}
