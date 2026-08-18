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

type ConfigValue = string | null | undefined;

type ActionInput<Action> = Action extends (...args: infer Arguments) => unknown
  ? Arguments extends [infer Value]
    ? Value
    : never
  : never;

type ConfigActionKey<State> = [State] extends [never]
  ? PropertyKey
  : {
      [Key in keyof State]-?: [ActionInput<State[Key]>] extends [ConfigValue]
        ? [ConfigValue] extends [ActionInput<State[Key]>]
          ? Key
          : never
        : never;
    }[keyof State];

type ConfigStateKey<State> = [State] extends [never] ? PropertyKey : keyof State;

/**
 * Maps provider inputs to feature-owned state actions and detach-persistent keys.
 * Pass the feature's source-state type when declaring a config map so both keys
 * are checked and each action accepts nullable text, including absent input.
 */
export type PlayerFeatureConfig<State = never> = Record<
  string,
  {
    /** Private source-state action that accepts `string | null | undefined`. */
    action: ConfigActionKey<State>;
    /** Provider-owned source-state key whose value survives media detach. */
    state: ConfigStateKey<State>;
  }
>;

export type PlayerFeature<State, Derived = object, Config extends PlayerFeatureConfig = Record<never, never>> = Slice<
  PlayerTarget,
  State,
  Derived
> & {
  config?: Config;
};

export type AnyPlayerFeature = AnySlice<PlayerTarget> & { config?: PlayerFeatureConfig };

export type InferPlayerFeatureConfig<Feature extends AnyPlayerFeature> = Feature extends {
  config?: infer Config extends PlayerFeatureConfig;
}
  ? {
      [Key in keyof Config]: Config[Key]['action'] extends keyof InferSliceSourceState<Feature>
        ? ActionInput<InferSliceSourceState<Feature>[Config[Key]['action']]>
        : never;
    }
  : object;

export type UnionPlayerConfig<Features extends readonly AnyPlayerFeature[]> = Features extends readonly []
  ? object
  : Simplify<UnionToIntersection<InferPlayerFeatureConfig<Features[number]>>>;

declare const PLAYER_CONFIG: unique symbol;

export type PlayerStore<Features extends AnyPlayerFeature[] = []> = Store<PlayerTarget, UnionSliceState<Features>> & {
  readonly [PLAYER_CONFIG]?: UnionPlayerConfig<Features>;
};

export type InferPlayerConfig<Store> = Store extends {
  readonly [PLAYER_CONFIG]?: infer Config;
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
