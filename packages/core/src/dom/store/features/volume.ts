import type { MediaFeatureAvailability, MediaVolumeState } from '@videojs/media';
import { isMediaMutedCapable, isMediaVolumeCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';

import { definePlayerFeature } from '../../feature';

/** Volume to restore when unmuting at zero. */
const UNMUTE_VOLUME = 0.25;

export const volumeFeature = definePlayerFeature({
  name: 'volume',
  state: ({ target }): MediaVolumeState => ({
    volume: 1,
    muted: false,
    volumeAvailability: 'unavailable',
    mutedAvailability: 'unavailable',

    setVolume(volume: number) {
      const { media } = target();
      if (!isMediaVolumeCapable(media)) return 0;

      const clamped = Math.max(0, Math.min(1, volume));

      if (clamped > 0 && media.muted) {
        media.muted = false;
      }

      media.volume = clamped;
      return media.volume;
    },

    toggleMuted() {
      const { media } = target();
      if (!isMediaMutedCapable(media)) return false;

      // A media that mutes but reports no level has nothing to restore, so the
      // mute is simply flipped.
      if (!isMediaVolumeCapable(media)) {
        media.muted = !media.muted;
        return media.muted;
      }

      const effectivelyMuted = media.muted || media.volume === 0;

      if (effectivelyMuted) {
        media.muted = false;

        if (media.volume === 0) media.volume = UNMUTE_VOLUME;
      } else {
        media.muted = true;
      }

      return media.muted;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const volumeCapable = isMediaVolumeCapable(media);
    const mutedCapable = isMediaMutedCapable(media);
    // The two come apart, so either one alone is worth attaching for: a media
    // that mutes but sets no level still drives a mute button.
    if (!volumeCapable && !mutedCapable) return;

    set({
      volumeAvailability: volumeCapable ? canSetVolume() : 'unavailable',
      mutedAvailability: mutedCapable ? 'available' : 'unavailable',
    });

    const sync = () =>
      set({
        volume: volumeCapable ? media.volume : 1,
        muted: mutedCapable ? media.muted : false,
      });

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
