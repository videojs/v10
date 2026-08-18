'use client';

import { liveVideoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

/** Preconfigured player with the live video features. */
export const {
  Player: LiveVideoPlayer,
  /** Access the live video player store or select a value from it. */
  usePlayer,
} = createPlayer({ features: liveVideoFeatures, displayName: 'LiveVideoPlayer' });
