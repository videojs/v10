'use client';

import { audioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({ features: audioFeatures, displayName: 'AudioPlayer' });

/** Preconfigured player provider with the standard audio features. */
export const AudioPlayer = player.Provider;

if (__DEV__) AudioPlayer.displayName = 'AudioPlayer';

/** Access the standard audio player store or select a value from it. */
export const usePlayer = player.usePlayer;
