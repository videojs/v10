import type {
  Media,
  MediaAudioTrackState,
  MediaBufferState,
  MediaControlsState,
  MediaErrorState,
  MediaFullscreenState,
  MediaLiveState,
  MediaPictureInPictureState,
  MediaPlaybackRateState,
  MediaPlaybackState,
  MediaQualityState,
  MediaRemotePlaybackState,
  MediaSourceState,
  MediaTextTrackState,
  MediaTimeState,
  MediaVolumeState,
} from '@videojs/media';
import type { AnySlice, Slice, Store, UnionSliceConfig, UnionSliceState } from '@videojs/store';
import type { metadataFeature } from './store/features/metadata';

export interface MediaContainer extends HTMLElement {}

export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

export type PlayerFeature<State, Config = object, Derived = object> = Slice<PlayerTarget, State, Config, Derived>;

export type AnyPlayerFeature = AnySlice<PlayerTarget>;

export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<
  PlayerTarget,
  UnionSliceState<Features>,
  UnionSliceConfig<Features>
>;

export type AnyPlayerStore = Store<PlayerTarget, object>;

// ----------------------------------------
// Feature Presets
// ----------------------------------------

export type VideoFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaPlaybackRateState>,
  PlayerFeature<MediaQualityState>,
  PlayerFeature<MediaAudioTrackState>,
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
  typeof metadataFeature,
];

export type AudioFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaPlaybackRateState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaErrorState>,
  typeof metadataFeature,
];

// TODO: Define background video features (e.g., playback, source, buffer)
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
  typeof metadataFeature,
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
  typeof metadataFeature,
];

export type VideoPlayerStore = PlayerStore<VideoFeatures>;

export type AudioPlayerStore = PlayerStore<AudioFeatures>;

export type BackgroundPlayerStore = PlayerStore<BackgroundFeatures>;

export type LiveVideoPlayerStore = PlayerStore<LiveVideoFeatures>;

export type LiveAudioPlayerStore = PlayerStore<LiveAudioFeatures>;
