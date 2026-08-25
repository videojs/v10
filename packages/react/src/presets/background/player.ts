'use client';

import { backgroundFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';

/** Preconfigured player with the background video features. */
export const {
  Player: BackgroundVideoPlayer,
  /** Access the background video player store or select a value from it. */
  usePlayer,
} = createPlayer({ features: backgroundFeatures, displayName: 'BackgroundVideoPlayer' });
