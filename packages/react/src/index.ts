'use client';

// Core
export * from '@videojs/core/dom';

// Store
export type { Comparator, Selector } from '@videojs/store';
export { createSelector, shallowEqual } from '@videojs/store';
export { useSelector, useStore } from '@videojs/store/react';

// Media primitives
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
export { BufferingIndicator, type BufferingIndicatorProps } from './ui/buffering-indicator/buffering-indicator';
export { Controls } from './ui/controls';
export type { ControlsGroupProps } from './ui/controls/controls-group';
export type { ControlsRootProps } from './ui/controls/controls-root';
export { FullscreenButton, type FullscreenButtonProps } from './ui/fullscreen-button/fullscreen-button';
export { useButton } from './ui/hooks/use-button';
export { useSlider } from './ui/hooks/use-slider';
export { MuteButton, type MuteButtonProps } from './ui/mute-button/mute-button';
export { PiPButton, type PiPButtonProps } from './ui/pip-button/pip-button';
export { PlayButton, type PlayButtonProps } from './ui/play-button/play-button';
export { PlaybackRateButton, type PlaybackRateButtonProps } from './ui/playback-rate-button/playback-rate-button';
export { Popover, type PopoverContextValue, usePopoverContext } from './ui/popover';
export { Poster, type PosterProps } from './ui/poster/poster';
export { SeekButton, type SeekButtonProps } from './ui/seek-button/seek-button';
export { Slider } from './ui/slider';
export type { SliderBufferProps } from './ui/slider/slider-buffer';
export type { SliderFillProps } from './ui/slider/slider-fill';
export type { SliderRootProps } from './ui/slider/slider-root';
export type { SliderThumbProps } from './ui/slider/slider-thumb';
export type { SliderTrackProps } from './ui/slider/slider-track';
export type { SliderValueProps } from './ui/slider/slider-value';
export { Thumbnail, type ThumbnailProps } from './ui/thumbnail/thumbnail';
export { Time } from './ui/time';
export { TimeSlider } from './ui/time-slider';
export { VolumeSlider } from './ui/volume-slider';

// Utilities
export { mergeProps } from './utils/merge-props';
export type { HTMLProps, RenderFunction, RenderProp, UIComponentProps } from './utils/types';
export { renderElement } from './utils/use-render';
