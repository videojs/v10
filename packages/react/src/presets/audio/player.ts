'use client';

import { audioFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({ features: audioFeatures, displayName: 'AudioPlayer' });

/** Preconfigured player with the standard audio features. */
export const AudioPlayer = player.Player;

/** Access the standard audio player store or select a value from it. */
export const usePlayer = player.usePlayer;
