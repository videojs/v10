'use client';

import { liveVideoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

/** Preconfigured player instance with the live video features. */
export const LiveVideoPlayer = createPlayer({ features: liveVideoFeatures, displayName: 'LiveVideoPlayer' });

/** Access the live video player store or select a value from it. */
export const usePlayer = LiveVideoPlayer.usePlayer;
