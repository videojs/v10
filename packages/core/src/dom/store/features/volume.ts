import { listen } from '@videojs/utils/dom';

import type { FeatureAvailability, VolumeState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const volumeFeature = definePlayerFeature({
  state: ({ target }): VolumeState => ({
    volume: 1,
    muted: false,
    volumeAvailability: 'unavailable',

    changeVolume(volume: number) {
      const { media } = target();
      media.volume = Math.max(0, Math.min(1, volume));
      return media.volume;
    },

    toggleMute() {
      const { media } = target();
      media.muted = !media.muted;
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
function canSetVolume(): FeatureAvailability {
  const video = document.createElement('video');
  try {
    video.volume = 0.5;
    return video.volume === 0.5 ? 'available' : 'unsupported';
  } catch {
    return 'unsupported';
  }
}
