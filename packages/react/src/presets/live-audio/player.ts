'use client';

import { liveAudioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({ features: liveAudioFeatures, displayName: 'LiveAudioPlayer' });

/** Preconfigured player provider with the live audio features. */
export const LiveAudioPlayer = player.Provider;

if (__DEV__) LiveAudioPlayer.displayName = 'LiveAudioPlayer';

/** Access the live audio player store or select a value from it. */
export const usePlayer = player.usePlayer;
