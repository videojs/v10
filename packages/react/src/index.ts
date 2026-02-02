'use client';

// Re-exports from core/dom
export {
  type AnyPlayerFeature,
  type BufferState,
  definePlayerFeature,
  type FeatureAvailability,
  features,
  type Media,
  type MediaContainer,
  type PlaybackState,
  type PlayerFeature,
  type PlayerStore,
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

// Re-exports from store (utilities)
export type { Comparator, Selector } from '@videojs/store';
export { createSelector, shallowEqual } from '@videojs/store';
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
