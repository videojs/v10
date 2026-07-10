'use client';

export type { IndicatorStatus, InputAction, InputIndicatorLabels } from '@videojs/core';
// Core
export * from '@videojs/core/dom';
// Media predicates
export * from '@videojs/core/media/predicate';
// Store
export type { Comparator, Selector } from '@videojs/store';
export { createSelector, shallowEqual } from '@videojs/store';
export { useSelector, useStore } from '@videojs/store/react';
// i18n
export {
  type CreateI18nOptions,
  type CreateI18nResult,
  createI18n,
  createTranslator,
  findLocaleKeys,
  getI18nTranslations,
  hasRegisteredLocale,
  I18nContext,
  type I18nContextValue,
  I18nProvider,
  type I18nProviderProps,
  type Locale,
  onI18nRegistryChange,
  registerI18n,
  type TranslationParams,
  type Translations,
  type Translator,
  useLocale,
  useTranslator,
} from './i18n';
// Media primitives
export {
  Container,
  type ContainerProps,
} from './player/container';
export {
  type PlayerContextValue,
  useContainer,
  useContainerAttach,
  useMedia,
  useMediaAttach,
  useOptionalContainer,
  useOptionalPlayer,
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
export { AirPlayButton, type AirPlayButtonProps } from './ui/airplay-button/airplay-button';
export { AlertDialog, type AlertDialogContextValue, useAlertDialogContext } from './ui/alert-dialog';
export {
  type AudioTrackOption,
  type AudioTrackOptionsProps,
  type AudioTrackOptionsResult,
  useAudioTrackOptions,
} from './ui/audio-track';
export { BufferingIndicator, type BufferingIndicatorProps } from './ui/buffering-indicator/buffering-indicator';
export { CaptionsButton, type CaptionsButtonProps } from './ui/captions-button/captions-button';
export {
  type CaptionsOption,
  type CaptionsOptionsProps,
  type CaptionsOptionsResult,
  useCaptionsOptions,
} from './ui/captions-radio-group';
export { CastButton, type CastButtonProps } from './ui/cast-button/cast-button';
export { Controls } from './ui/controls';
export type { ControlsGroupProps } from './ui/controls/controls-group';
export type { ControlsRootProps } from './ui/controls/controls-root';
export { ErrorDialog, type ErrorDialogContextValue, useErrorDialogContext } from './ui/error-dialog';
export { FullscreenButton, type FullscreenButtonProps } from './ui/fullscreen-button/fullscreen-button';
export { Gesture, type GestureProps, MediaGesture, type MediaGestureProps } from './ui/gesture/gesture';
export { type UseDoubleTapGestureOptions, useDoubleTapGesture } from './ui/gesture/use-doubletap-gesture';
export { type UseTapGestureOptions, useTapGesture } from './ui/gesture/use-tap-gesture';
export { useButton } from './ui/hooks/use-button';
export { useSlider } from './ui/hooks/use-slider';
export { Hotkey, type HotkeyProps, MediaHotkey, type MediaHotkeyProps } from './ui/hotkey/hotkey';
export { type UseHotkeyOptions, useHotkey } from './ui/hotkey/use-hotkey';
export { useHotkeyShortcut } from './ui/hotkey/use-hotkey-shortcut';
export { LiveButton, type LiveButtonProps } from './ui/live-button/live-button';
export { Menu, type MenuContextValue, useMenuContext, useOptionalMenuContext } from './ui/menu';
export { MuteButton, type MuteButtonProps } from './ui/mute-button/mute-button';
export { PiPButton, type PiPButtonProps } from './ui/pip-button/pip-button';
export { PlayButton, type PlayButtonProps } from './ui/play-button/play-button';
export {
  type PlaybackRateOption,
  type PlaybackRateOptionsProps,
  type PlaybackRateOptionsResult,
  usePlaybackRateOptions,
} from './ui/playback-rate';
export { PlaybackRateButton, type PlaybackRateButtonProps } from './ui/playback-rate-button/playback-rate-button';
export { Popover, type PopoverContextValue, usePopoverContext } from './ui/popover';
export { Poster, type PosterProps } from './ui/poster/poster';
export {
  type QualityOption,
  type QualityOptionsProps,
  type QualityOptionsResult,
  useQualityOptions,
} from './ui/quality';
export { SeekButton, type SeekButtonProps } from './ui/seek-button/seek-button';
export { SeekIndicator } from './ui/seek-indicator';
export type { SeekIndicatorRootProps } from './ui/seek-indicator/seek-indicator-root';
export type { SeekIndicatorValueProps } from './ui/seek-indicator/seek-indicator-value';
export { Slider } from './ui/slider';
export type { SliderBufferProps } from './ui/slider/slider-buffer';
export type { SliderFillProps } from './ui/slider/slider-fill';
export type { SliderRootProps } from './ui/slider/slider-root';
export type { SliderThumbProps } from './ui/slider/slider-thumb';
export type { SliderThumbnailProps } from './ui/slider/slider-thumbnail';
export type { SliderTrackProps } from './ui/slider/slider-track';
export type { SliderValueProps } from './ui/slider/slider-value';
export { StatusAnnouncer, type StatusAnnouncerProps } from './ui/status-announcer/status-announcer';
export { StatusIndicator } from './ui/status-indicator';
export type { StatusIndicatorRootProps } from './ui/status-indicator/status-indicator-root';
export type { StatusIndicatorValueProps } from './ui/status-indicator/status-indicator-value';
export { Thumbnail, type ThumbnailProps } from './ui/thumbnail/thumbnail';
export { Time } from './ui/time';
export { TimeSlider } from './ui/time-slider';
export { Tooltip, type TooltipContent, type TooltipContextValue, useTooltipContext } from './ui/tooltip';
export { VolumeIndicator } from './ui/volume-indicator';
export type { VolumeIndicatorFillProps } from './ui/volume-indicator/volume-indicator-fill';
export type { VolumeIndicatorRootProps } from './ui/volume-indicator/volume-indicator-root';
export type { VolumeIndicatorValueProps } from './ui/volume-indicator/volume-indicator-value';
export { VolumeSlider } from './ui/volume-slider';
// Utilities
export { mergeProps } from './utils/merge-props';
export type { HTMLProps, RenderFunction, RenderProp, UIComponentProps } from './utils/types';
export { useAttachMedia } from './utils/use-attach-media';
export { composeRefs, useComposedRefs } from './utils/use-composed-refs';
export { useDestroy } from './utils/use-destroy';
export { useLatestRef } from './utils/use-latest-ref';
export { useMediaInstance } from './utils/use-media-instance';
export { renderElement } from './utils/use-render';
