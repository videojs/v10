'use client';

// Core
export * from '@videojs/core/dom';

// Store
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
