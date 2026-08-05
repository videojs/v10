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
import type { AnySlice, InferSliceSourceState, Slice, Store, UnionSliceState } from '@videojs/store';
import type { Simplify, UnionToIntersection } from '@videojs/utils/types';
import type { metadataFeature } from './store/features/metadata';

export interface MediaContainer extends HTMLElement {}

export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

export interface PlayerProviderBinding<
  StateKey extends PropertyKey = PropertyKey,
  ActionKey extends PropertyKey = PropertyKey,
> {
  /** User-owned source-state key preserved when media detaches. */
  state: StateKey;
  /** Private source-state action that receives provider updates. */
  action: ActionKey;
}

export type PlayerProviderDefinition = Record<string, PlayerProviderBinding>;

export type PlayerFeature<
  State,
  Derived = object,
  Provider extends PlayerProviderDefinition = Record<never, never>,
> = Slice<PlayerTarget, State, Derived> & {
  provider?: Provider;
};

export type AnyPlayerFeature = AnySlice<PlayerTarget> & { provider?: PlayerProviderDefinition };

type ActionInput<Action> = Action extends (value: infer Value) => unknown ? Value : never;

export type InferPlayerFeatureProviderConfig<Feature extends AnyPlayerFeature> = Feature extends {
  provider?: infer Provider extends PlayerProviderDefinition;
}
  ? {
      [Key in keyof Provider]: Provider[Key]['action'] extends keyof InferSliceSourceState<Feature>
        ? ActionInput<InferSliceSourceState<Feature>[Provider[Key]['action']]>
        : never;
    }
  : object;

export type UnionPlayerProviderConfig<Features extends readonly AnyPlayerFeature[]> = Features extends readonly []
  ? object
  : Simplify<UnionToIntersection<InferPlayerFeatureProviderConfig<Features[number]>>>;

declare const PLAYER_PROVIDER_CONFIG: unique symbol;

export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<PlayerTarget, UnionSliceState<Features>> & {
  readonly [PLAYER_PROVIDER_CONFIG]?: UnionPlayerProviderConfig<Features>;
};

export type InferPlayerProviderConfig<Store> = Store extends {
  readonly [PLAYER_PROVIDER_CONFIG]?: infer Config;
}
  ? Config
  : object;

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
