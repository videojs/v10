import { listen } from '@videojs/utils/dom';
import { createFeature } from '../store';
import type { FeatureActions, FeatureState } from '../types';

export const volumeFeature = createFeature<{ media: HTMLMediaElement }>()(() => ({
  initialState: {
    /** Whether audio is muted. */
    muted: true,
    /** Volume level from 0 to 1. */
    volume: 1.0,
    /** Derived volume level for UI. */
    volumeLevel: 'high' as 'high' | 'medium' | 'low' | 'off',
  },

  getSnapshot: ({ media }) => ({
    muted: media.muted,
    volume: media.volume,
    volumeLevel: getVolumeLevel(media.muted, media.volume),
  }),

  subscribe: {
    media: ({ media }, update, signal) => {
      listen(media, 'volumechange', update, { signal });
    },
  },

  actions: ({ media }) => ({
    setMuted(value: boolean) {
      media.muted = value;

      if (!value && !media.volume) {
        media.volume = 0.25;
      }
    },
    setVolume(value: number) {
      const numericValue = +value;
      if (!Number.isFinite(numericValue)) return;

      media.volume = numericValue;

      if (numericValue > 0) {
        media.muted = false;
      }
    },
  }),
}));

export type VolumeState = FeatureState<typeof volumeFeature>;
export type VolumeActions = FeatureActions<typeof volumeFeature>;

function getVolumeLevel(muted: boolean, volume: number): 'high' | 'medium' | 'low' | 'off' {
  if (muted || volume === 0) return 'off';
  if (volume < 0.5) return 'low';
  if (volume < 0.75) return 'medium';
  return 'high';
}
