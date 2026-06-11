import type {
  MediaPauseCapability,
  MediaPlaybackCapability,
  MediaPlaybackRateCapability,
  MediaPosterCapability,
  MediaRemotePlaybackCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaStreamTypeCapability,
  MediaTextTrackCapability,
  MediaVolumeCapability,
  RemotePlaybackLike,
} from '../../../core/media/types';
import type { RemotePlayback } from './remote-playback';
import type { CastOptions } from './utils';

export interface GoogleCastMediaProps {
  castSrc: string | undefined;
  castReceiver: string | undefined;
  castContentType: string | undefined;
  castStreamType: string | undefined;
  castCustomData: Record<string, unknown> | null | undefined;
}

export const googleCastMediaDefaultProps: GoogleCastMediaProps = {
  castSrc: undefined,
  castReceiver: undefined,
  castContentType: undefined,
  castStreamType: undefined,
  castCustomData: undefined,
};

export interface GoogleCastMediaHost
  extends EventTarget,
    MediaPlaybackCapability,
    MediaPauseCapability,
    MediaVolumeCapability,
    MediaPlaybackRateCapability,
    MediaPosterCapability,
    MediaSourceCapability,
    MediaSeekCapability,
    MediaStreamTypeCapability,
    MediaTextTrackCapability,
    MediaRemotePlaybackCapability {
  title: string;
  attach(target: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): Iterable<HTMLElementTagNameMap[K]>;
  querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
}

export interface GoogleCastMedia extends GoogleCastMediaProps {
  readonly remote: RemotePlayback | RemotePlaybackLike | undefined;
  readonly castOptions: CastOptions;
  poster: string;
  title: string;
}

export type GoogleCastMediaElement = GoogleCastMediaHost & GoogleCastMedia;

export interface GoogleCastMediaHostConstructor {
  new (...args: any[]): GoogleCastMediaHost;
}
