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

// UI
export { Controls } from './ui/controls';
export type { ControlsGroupProps } from './ui/controls/controls-group';
export type { ControlsRootProps } from './ui/controls/controls-root';
export { FullscreenButton, type FullscreenButtonProps } from './ui/fullscreen-button/fullscreen-button';
export { useButton } from './ui/hooks/use-button';
export { MuteButton, type MuteButtonProps } from './ui/mute-button/mute-button';
export { PlayButton, type PlayButtonProps } from './ui/play-button/play-button';
export { Poster, type PosterProps } from './ui/poster/poster';
export { SeekButton, type SeekButtonProps } from './ui/seek-button/seek-button';
export { Time } from './ui/time';

// Utilities
export { mergeProps } from './utils/merge-props';
export type { HTMLProps, RenderFunction, RenderProp, UIComponentProps } from './utils/types';
export { renderElement } from './utils/use-render';
