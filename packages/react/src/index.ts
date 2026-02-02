'use client';

// Re-exports from core/dom
export {
  type BufferState,
  type FeatureAvailability,
  features,
  type Media,
  type MediaContainer,
  type PlaybackState,
  type PlayerTarget,
  type SourceState,
  selectBuffer,
  selectPlayback,
  selectSource,
  selectTime,
  selectVolume,
  type TimeState,
  type VolumeState,
} from '@videojs/core/dom';

export type { AnyFeature, Feature, InferFeatureState } from '@videojs/store';

// Re-exports (for custom features)
export { createFeatureSelector, defineFeature } from '@videojs/store';
export type { Comparator, Selector } from '@videojs/store/react';

// Re-exports (for advanced store access)
export { useSelector, useStore } from '@videojs/store/react';

// Media primitives
export { Audio, type AudioProps } from './media/audio';
export { Video, type VideoProps } from './media/video';
export {
  Container,
  type ContainerProps,
  type PlayerContextValue,
  useMedia,
  useMediaRegistration,
  usePlayer,
  usePlayerContext,
} from './player/context';

// Player API
export {
  type CreatePlayerConfig,
  type CreatePlayerResult,
  createPlayer,
  type ProviderProps,
} from './player/create-player';
