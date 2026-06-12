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
import type { Media, MediaTargetLike } from '../../core/media/types';
import type { HTMLMediaElementHost } from './media-host';

export type { Media };

export type QueriedElement<S extends string, E extends Element> = S extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[S]
  : E;

export type EventType<Events> = (keyof Events & string) | (string & {});

export type EventListenerFor<Events, K> =
  | ((event: K extends keyof Events ? Events[K] : Event) => void)
  | EventListenerOrEventListenerObject
  | null;

export interface HTMLMediaTargetLike extends MediaTargetLike, EventTarget {
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> | never[];
}

export interface Component<Target extends HTMLMediaTargetLike = HTMLMediaTargetLike> {
  readonly targetOverride?: Partial<Target> | null;
  setMedia?(host: HTMLMediaElementHost<Target, any>): void;
  attach?(target: Target): void;
  detach?(): void;
  destroy?(): void;
}

export type AnyComponent = Component;

export interface ComponentConstructor<T extends AnyComponent = AnyComponent> {
  new (...args: any[]): T;
  /**
   * Namespaces the component's live config under `host.config[configKey]`.
   * Reading returns the component instance; writing assigns onto it.
   */
  readonly configKey?: string;
}
export interface Components extends Map<ComponentConstructor, AnyComponent> {
  get<T extends AnyComponent>(component: ComponentConstructor<T>): T | undefined;
  set<T extends AnyComponent>(component: ComponentConstructor<T>, instance: T): this;
}

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

export type VideoPlayerStore = PlayerStore<VideoFeatures>;

export type AudioPlayerStore = PlayerStore<AudioFeatures>;

export type BackgroundPlayerStore = PlayerStore<BackgroundFeatures>;

export type LiveVideoPlayerStore = PlayerStore<LiveVideoFeatures>;

export type LiveAudioPlayerStore = PlayerStore<LiveAudioFeatures>;
