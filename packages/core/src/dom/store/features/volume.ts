import type { InferSliceState } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';
import type { FeatureAvailability } from '../../types';

export const volumeFeature = definePlayerFeature({
  state: ({ task }) => ({
    /** Volume level from 0 (silent) to 1 (max). */
    volume: 1,
    /** Whether audio is muted. */
    muted: false,
    /** Whether volume can be programmatically set on this platform. */
    volumeAvailability: 'unavailable' as FeatureAvailability,

    /** Set volume (clamped 0-1). Returns the clamped value. */
    changeVolume(volume: number) {
      return task({
        key: 'volume',
        handler({ target }) {
          target.media.volume = Math.max(0, Math.min(1, volume));
          return target.media.volume;
        },
      });
    },

    /** Toggle mute state. Returns new muted value. */
    toggleMute() {
      return task({
        key: 'mute',
        handler({ target }) {
          target.media.muted = !target.media.muted;
          return target.media.muted;
        },
      });
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

export type VolumeState = InferSliceState<typeof volumeFeature>;

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
