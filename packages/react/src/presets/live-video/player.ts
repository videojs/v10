'use client';

import { liveVideoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({ features: liveVideoFeatures, displayName: 'LiveVideoPlayer' });

/** Preconfigured player provider with the live video features. */
export const LiveVideoPlayer = player.Provider;

if (__DEV__) LiveVideoPlayer.displayName = 'LiveVideoPlayer';

/** Access the live video player store or select a value from it. */
export const usePlayer = player.usePlayer;
