'use client';

import { liveAudioFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';

/** Preconfigured player with the live audio features. */
export const {
  Player: LiveAudioPlayer,
  /** Access the live audio player store or select a value from it. */
  usePlayer,
} = createPlayer({ features: liveAudioFeatures, displayName: 'LiveAudioPlayer' });
