'use client';

import { liveAudioFeatures } from '@videojs/core/dom';
import type { ComponentProps } from 'react';

import { createPlayer } from '../../player/create-player';

/** Preconfigured player with the live audio features. */
export const {
  Player: LiveAudioPlayer,
  /** Access the live audio player store or select a value from it. */
  usePlayer,
} = createPlayer({ features: liveAudioFeatures, displayName: 'LiveAudioPlayer' });

/** Props accepted by the preconfigured live-audio Player. */
export interface LiveAudioPlayerProps extends ComponentProps<typeof LiveAudioPlayer> {}
