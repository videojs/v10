'use client';

import { videoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

/** Preconfigured player instance with the standard video features. */
export const VideoPlayer = createPlayer({ features: videoFeatures, displayName: 'VideoPlayer' });

/** Access the standard video player store or select a value from it. */
export const usePlayer = VideoPlayer.usePlayer;
