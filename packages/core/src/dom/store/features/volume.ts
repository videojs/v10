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
      const effectivelyMuted = media.muted || media.volume === 0;

      if (effectivelyMuted) {
        media.muted = false;
        // Restore a sensible volume when unmuting at zero.
        if (media.volume === 0) media.volume = UNMUTE_VOLUME;
      } else {
        media.muted = true;
      }

      return media.muted;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    detectVolumeAvailability().then((volumeAvailability) => {
      if (signal.aborted) return;
      set({ volumeAvailability });
    });

    const sync = () => set({ volume: media.volume, muted: media.muted });
    sync();

    listen(media, 'volumechange', sync, { signal });
  },
});

function detectVolumeAvailability(): Promise<MediaFeatureAvailability> {
  return probeVolumeAvailability().catch(() => 'unsupported');
}

async function probeVolumeAvailability(): Promise<MediaFeatureAvailability> {
  const video = document.createElement('video');
  const parent = document.body ?? document.documentElement;
  const initialVolume = video.volume;
  const nextVolume = initialVolume === 0.5 ? 0.25 : 0.5;

  video.muted = true;
  video.preload = 'none';
  video.playsInline = true;
  video.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;';
  parent?.append(video);

  try {
    video.volume = nextVolume;
    await waitForProbeFrame();
    return video.volume === nextVolume ? 'available' : 'unsupported';
  } finally {
    video.remove();
  }
}

function waitForProbeFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
