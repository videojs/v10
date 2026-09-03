'use client';

import { audioFeatures } from '@videojs/core/dom';
import type { ComponentProps } from 'react';

import { createPlayer } from '../../player/create-player';

/** Preconfigured player with the standard audio features. */
export const {
  Player: AudioPlayer,
  /** Access the standard audio player store or select a value from it. */
  usePlayer,
} = createPlayer({ features: audioFeatures, displayName: 'AudioPlayer' });

/** Props accepted by the preconfigured audio Player. */
export interface AudioPlayerProps extends ComponentProps<typeof AudioPlayer> {}
