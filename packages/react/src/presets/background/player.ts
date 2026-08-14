'use client';

import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({
  features: backgroundFeatures,
  displayName: 'BackgroundVideoPlayer',
});

/** Preconfigured player provider with the background video features. */
export const BackgroundVideoPlayer = player.Provider;

if (__DEV__) BackgroundVideoPlayer.displayName = 'BackgroundVideoPlayer';

/** Access the background video player store or select a value from it. */
export const usePlayer = player.usePlayer;
