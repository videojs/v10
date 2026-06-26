import { listen } from '@videojs/utils/dom';
import { isBoolean, isNumber, isPlainObject } from '@videojs/utils/predicate';
import { isMediaVolumeCapable } from '../../../core/media/predicate';
import type { MediaVolumeState } from '../../../core/media/state';
import type { MediaFeatureAvailability, MediaVolumeCapability } from '../../../core/media/types';
import { definePlayerFeature } from '../../feature';
import { getUserPreference, setUserPreference } from './user-preferences';

/** Volume to restore when unmuting at zero. */
const UNMUTE_VOLUME = 0.25;
const DEFAULT_VOLUME = 1;
const DEFAULT_MUTED = false;
const PREF_KEY = 'volume';
const UNSET = Symbol('unset');

export const volumeFeature = definePlayerFeature({
  name: 'volume',
  state: ({ target, get }): MediaVolumeState => ({
    volume: 1,
    muted: false,
    volumeAvailability: 'unavailable',

    setVolume(volume: number) {
      const { media } = target();
      if (!isMediaVolumeCapable(media)) return 0;
      const clamped = Math.max(0, Math.min(1, volume));

      if (clamped > 0 && media.muted) {
        media.muted = false;
      }

      media.volume = clamped;
      setUserPreference(get(), PREF_KEY, getVolumePreference(media));
      return media.volume;
    },

    toggleMuted() {
      const { media } = target();
      if (!isMediaVolumeCapable(media)) return false;
      const effectivelyMuted = media.muted || media.volume === 0;

      if (effectivelyMuted) {
        media.muted = false;
        if (media.volume === 0) media.volume = UNMUTE_VOLUME;
      } else {
        media.muted = true;
      }

      setUserPreference(get(), PREF_KEY, getVolumePreference(media));
      return media.muted;
    },
  }),

  attach({ target, signal, set, store }) {
    const { media } = target;

    if (!isMediaVolumeCapable(media)) return;

    set({ volumeAvailability: canSetVolume() });

    let applying = false;
    let lastPreference: unknown = UNSET;

    const apply = () => {
      const value = getUserPreference(store.state, PREF_KEY);
      if (Object.is(value, lastPreference)) return;
      const hadPreference = lastPreference !== UNSET;
      lastPreference = value;
      if (value === undefined) {
        if (hadPreference) setVolume(DEFAULT_VOLUME, DEFAULT_MUTED);
        return;
      }
      if (!isVolumePreference(value)) return;

      setVolume(value.volume, value.muted);
    };

    const setVolume = (volume: number, muted: boolean) => {
      applying = true;
      media.volume = volume;
      media.muted = muted;
      set({ volume: media.volume, muted: media.muted });
      applying = false;
    };

    const sync = () => {
      set({ volume: media.volume, muted: media.muted });
      if (!applying) {
        setUserPreference(store.state, PREF_KEY, getVolumePreference(media));
      }
    };

    const unsubscribe = store.subscribe(apply);
    signal.addEventListener('abort', unsubscribe, { once: true });

    set({ volume: media.volume, muted: media.muted });
    apply();

    listen(media, 'volumechange', sync, { signal });
  },
});

interface VolumePreference {
  volume: number;
  muted: boolean;
}

function getVolumePreference(media: MediaVolumeCapability): VolumePreference {
  return {
    volume: Math.round(media.volume * 100) / 100,
    muted: media.muted,
  };
}

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

function isVolumePreference(value: unknown): value is VolumePreference {
  return (
    isPlainObject(value) &&
    isNumber(value.volume) &&
    Number.isFinite(value.volume) &&
    value.volume >= 0 &&
    value.volume <= 1 &&
    isBoolean(value.muted)
  );
}
