import type { AnySlice, Slice, Store, UnionSliceState } from '@videojs/store';
import type {
  MediaBufferState,
  MediaControlsState,
  MediaErrorState,
  MediaFullscreenState,
  MediaLiveState,
  MediaPictureInPictureState,
  MediaPlaybackRateState,
  MediaPlaybackState,
  MediaRemotePlaybackState,
  MediaSourceState,
  MediaTextTrackState,
  MediaTimeState,
  MediaVolumeState,
} from '../../core/media/state';
import type { Media } from '../../core/media/types';

export type { Media };

/** Top-level container element that hosts the media and UI. */
export interface MediaContainer extends HTMLElement {}

/** The pair of media element and container that features operate against. */
export interface PlayerTarget {
  /** Media element backing the player. */
  media: Media;
  /** Container element, or `null` when not yet attached. */
  container: MediaContainer | null;
}

export type { MediaFeatureAvailability } from '../../core/media/types';

/** A single feature slice operating against a {@link PlayerTarget}. */
export type PlayerFeature<State> = Slice<PlayerTarget, State>;

/** Any feature slice for a {@link PlayerTarget}. */
export type AnyPlayerFeature = AnySlice<PlayerTarget>;

/** Player store composed from a tuple of {@link PlayerFeature}s. */
export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<PlayerTarget, UnionSliceState<Features>>;

/** Player store of any shape. */
export type AnyPlayerStore = Store<PlayerTarget, object>;

// ----------------------------------------
// Feature Presets
// ----------------------------------------

/** Feature preset for a video player. */
export type VideoFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaPlaybackRateState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaFullscreenState>,
  PlayerFeature<MediaPictureInPictureState>,
  PlayerFeature<MediaRemotePlaybackState>,
  PlayerFeature<MediaControlsState>,
  PlayerFeature<MediaTextTrackState>,
  PlayerFeature<MediaErrorState>,
];

/** Feature preset for an audio player. */
export type AudioFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaPlaybackRateState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaErrorState>,
];

// TODO: Define background video features (e.g., playback, source, buffer)
/** Feature preset for a background (autoplay, muted, no UI) video player. Currently empty. */
export type BackgroundFeatures = [];

/**
 * Features for a live video player. Mirrors {@link VideoFeatures} but drops
 * the playback-rate feature (not meaningful for live) and adds
 * `PlayerFeature<MediaLiveState>` so the store exposes `liveEdgeStart` and
 * `targetLiveWindow`.
 */
export type LiveVideoFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaFullscreenState>,
  PlayerFeature<MediaPictureInPictureState>,
  PlayerFeature<MediaRemotePlaybackState>,
  PlayerFeature<MediaControlsState>,
  PlayerFeature<MediaTextTrackState>,
  PlayerFeature<MediaErrorState>,
  PlayerFeature<MediaLiveState>,
];

/**
 * Features for a live audio player. Mirrors {@link AudioFeatures} but drops
 * the playback-rate feature (not meaningful for live) and adds
 * `PlayerFeature<MediaLiveState>` so the store exposes `liveEdgeStart` and
 * `targetLiveWindow`.
 */
export type LiveAudioFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaErrorState>,
  PlayerFeature<MediaLiveState>,
];

/** Store for a video player composed from {@link VideoFeatures}. */
export type VideoPlayerStore = PlayerStore<VideoFeatures>;

/** Store for an audio player composed from {@link AudioFeatures}. */
export type AudioPlayerStore = PlayerStore<AudioFeatures>;

/** Store for a background player composed from {@link BackgroundFeatures}. */
export type BackgroundPlayerStore = PlayerStore<BackgroundFeatures>;

/** Store for a live video player composed from {@link LiveVideoFeatures}. */
export type LiveVideoPlayerStore = PlayerStore<LiveVideoFeatures>;

/** Store for a live audio player composed from {@link LiveAudioFeatures}. */
export type LiveAudioPlayerStore = PlayerStore<LiveAudioFeatures>;
