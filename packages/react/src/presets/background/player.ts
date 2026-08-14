'use client';

import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

/** Preconfigured player instance with the background video features. */
export const BackgroundVideoPlayer = createPlayer({
  features: backgroundFeatures,
  displayName: 'BackgroundVideoPlayer',
});

/** Access the background video player store or select a value from it. */
export const usePlayer = BackgroundVideoPlayer.usePlayer;
