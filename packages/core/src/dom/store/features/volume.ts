import type { InferFeatureState } from '@videojs/store';

import { defineFeature } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

export const volumeFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task }) => ({
    /** Volume level from 0 (silent) to 1 (max). */
    volume: 1,
    /** Whether audio is muted. */
    muted: false,

    /** Set volume (clamped 0-1). Returns the clamped value. */
    changeVolume(volume: number) {
      return task({
        key: 'volume',
        handler({ target }) {
          target.volume = Math.max(0, Math.min(1, volume));
          return target.volume;
        },
      });
    },

    /** Toggle mute state. Returns new muted value. */
    toggleMute() {
      return task({
        key: 'mute',
        handler({ target }) {
          target.muted = !target.muted;
          return target.muted;
        },
      });
    },
  }),

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    listen(target, 'volumechange', sync, { signal });
  },
});

export type VolumeState = InferFeatureState<typeof volumeFeature>;
