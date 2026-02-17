import type { AnySlice, Slice, Store, UnionSliceState } from '@videojs/store';
import type {
  MediaBufferState,
  MediaFullscreenState,
  MediaPictureInPictureState,
  MediaPlaybackState,
  MediaSourceState,
  MediaTimeState,
  MediaVolumeState,
} from '../../core/media/state';

type WithOptional<Required, Full> = Required & Partial<Omit<Full, keyof Required>>;

export type MediaBaseApi = {
  play: () => Promise<void>;
  paused: boolean;
};

export type MediaApi = WithOptional<MediaBaseApi, HTMLVideoElement>;

export type Media = MediaApi | HTMLMediaElement | HTMLAudioElement | HTMLVideoElement | null;

export interface MediaContainer extends HTMLElement {}

export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

export type { MediaFeatureAvailability } from '../../core/media/state';

export type PlayerFeature<State> = Slice<PlayerTarget, State>;

export type AnyPlayerFeature = AnySlice<PlayerTarget>;

export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<PlayerTarget, UnionSliceState<Features>>;

export type AnyPlayerStore = Store<PlayerTarget, object>;

// ----------------------------------------
// Feature Presets
// ----------------------------------------

export type VideoFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
  PlayerFeature<MediaFullscreenState>,
  PlayerFeature<MediaPictureInPictureState>,
];

export type AudioFeatures = [
  PlayerFeature<MediaPlaybackState>,
  PlayerFeature<MediaVolumeState>,
  PlayerFeature<MediaTimeState>,
  PlayerFeature<MediaSourceState>,
  PlayerFeature<MediaBufferState>,
];

// TODO: Define background video features (e.g., playback, source, buffer)
export type BackgroundFeatures = [];

export type VideoPlayerStore = PlayerStore<VideoFeatures>;

export type AudioPlayerStore = PlayerStore<AudioFeatures>;

export type BackgroundPlayerStore = PlayerStore<BackgroundFeatures>;
