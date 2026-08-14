'use client';

import { audioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

/** Preconfigured player instance with the standard audio features. */
export const AudioPlayer = createPlayer({ features: audioFeatures, displayName: 'AudioPlayer' });

/** Access the standard audio player store or select a value from it. */
export const usePlayer = AudioPlayer.usePlayer;
