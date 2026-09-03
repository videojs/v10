'use client';

import { liveVideoFeatures } from '@videojs/core/dom';
import type { ComponentProps } from 'react';

import { createPlayer } from '../../player/create-player';

/** Preconfigured player with the live video features. */
export const {
  Player: LiveVideoPlayer,
  /** Access the live video player store or select a value from it. */
  usePlayer,
} = createPlayer({ features: liveVideoFeatures, displayName: 'LiveVideoPlayer' });

/** Props accepted by the preconfigured live-video Player. */
export interface LiveVideoPlayerProps extends ComponentProps<typeof LiveVideoPlayer> {}
