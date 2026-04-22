import type { AnySlice, Slice, Store, UnionSliceState } from '@videojs/store';
import type {
  MediaBufferState,
  MediaControlsState,
  MediaErrorState,
  MediaFullscreenState,
  MediaPictureInPictureState,
  MediaPlaybackRateState,
  MediaPlaybackState,
  MediaRemotePlaybackState,
  MediaSourceState,
  MediaStreamTypeState,
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
  PlayerFeature<MediaStreamTypeState>,
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
  PlayerFeature<MediaStreamTypeState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaErrorState>,
];

// TODO: Define background video features (e.g., playback, source, buffer)
export type BackgroundFeatures = [];

/**
 * Features for a live video player. Structurally identical to
 * {@link VideoFeatures} — the "live" presets share the same store but ship a
 * skin that omits duration-oriented UI.
 */
export type LiveVideoFeatures = VideoFeatures;

/**
 * Features for a live audio player. Structurally identical to
 * {@link AudioFeatures}.
 */
export type LiveAudioFeatures = AudioFeatures;

export type VideoPlayerStore = PlayerStore<VideoFeatures>;

export type AudioPlayerStore = PlayerStore<AudioFeatures>;

export type BackgroundPlayerStore = PlayerStore<BackgroundFeatures>;

export type LiveVideoPlayerStore = PlayerStore<LiveVideoFeatures>;

export type LiveAudioPlayerStore = PlayerStore<LiveAudioFeatures>;
