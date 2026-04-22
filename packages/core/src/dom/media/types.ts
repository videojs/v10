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

export interface MediaContainer extends HTMLElement {}

export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

export type { MediaFeatureAvailability } from '../../core/media/types';

export type PlayerFeature<State> = Slice<PlayerTarget, State>;

export type AnyPlayerFeature = AnySlice<PlayerTarget>;

export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<PlayerTarget, UnionSliceState<Features>>;

export type AnyPlayerStore = Store<PlayerTarget, object>;

// ----------------------------------------
// Feature Presets
// ----------------------------------------

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
export type BackgroundFeatures = [];

/**
 * Features for a live video player. Mirrors {@link VideoFeatures} without the
 * playback-rate feature, which isn't meaningful for live streams.
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
 * Features for a live audio player. Mirrors {@link AudioFeatures} without the
 * playback-rate feature, which isn't meaningful for live streams.
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

export type VideoPlayerStore = PlayerStore<VideoFeatures>;

export type AudioPlayerStore = PlayerStore<AudioFeatures>;

export type BackgroundPlayerStore = PlayerStore<BackgroundFeatures>;

export type LiveVideoPlayerStore = PlayerStore<LiveVideoFeatures>;

export type LiveAudioPlayerStore = PlayerStore<LiveAudioFeatures>;
