'use client';

import { liveAudioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

/** Preconfigured player instance with the live audio features. */
export const LiveAudioPlayer = createPlayer({ features: liveAudioFeatures, displayName: 'LiveAudioPlayer' });

/** Access the live audio player store or select a value from it. */
export const usePlayer = LiveAudioPlayer.usePlayer;
