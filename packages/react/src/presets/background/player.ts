'use client';

import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';

const player = createPlayer({
  features: backgroundFeatures,
  displayName: 'BackgroundVideoPlayer',
});

/** Preconfigured player with the background video features. */
export const BackgroundVideoPlayer = player.Player;

/** Access the background video player store or select a value from it. */
export const usePlayer = player.usePlayer;
