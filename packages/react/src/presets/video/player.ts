'use client';

import { videoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({ features: videoFeatures, displayName: 'VideoPlayer' });

/** Preconfigured player provider with the standard video features. */
export const VideoPlayer = player.Provider;

if (__DEV__) VideoPlayer.displayName = 'VideoPlayer';

/** Access the standard video player store or select a value from it. */
export const usePlayer = player.usePlayer;
