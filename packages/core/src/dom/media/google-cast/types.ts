import type { RemotePlaybackLike } from '../../../core/media/types';
import type { StreamType } from '../hls/index';
import type { RemotePlayback } from './remote-playback';
import type { CastOptions } from './utils';

/** Props that configure Google Cast playback for a media adapter. */
export interface GoogleCastMediaProps {
  /** Source URL to load on the Cast receiver. */
  castSrc: string | undefined;
  /** Cast receiver application ID. */
  castReceiver: string | undefined;
  /** MIME type for the Cast source. */
  castContentType: string | undefined;
  /** Stream type for the Cast source. */
  castStreamType: string | undefined;
  /** Custom data sent with the Cast load request. */
  castCustomData: Record<string, unknown> | null | undefined;
}

/** Defaults for {@link GoogleCastMediaProps}. */
export const googleCastMediaDefaultProps: GoogleCastMediaProps = {
  castSrc: undefined,
  castReceiver: undefined,
  castContentType: undefined,
  castStreamType: undefined,
  castCustomData: undefined,
};

/** Minimal host contract consumed by {@link GoogleCastMixin}. */
export interface GoogleCastMediaHost extends EventTarget {
  readonly target: HTMLMediaElement | null;
  readonly remote: RemotePlaybackLike | undefined;
  title: string;
  poster: string;
  src: string;
  currentSrc: string;
  currentTime: number;
  duration: number;
  muted: boolean;
  paused: boolean;
  ended: boolean;
  loop: boolean;
  seeking: boolean;
  readyState: number;
  volume: number;
  playbackRate: number;
  streamType?: StreamType;
  textTracks: TextTrackList;
  disableRemotePlayback: boolean;
  load(): void | Promise<void>;
  play(): void | Promise<void | undefined>;
  pause(): void;
  attach(target: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): Iterable<HTMLElementTagNameMap[K]>;
  querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
}

/** Public surface added by {@link GoogleCastMixin} on top of a {@link GoogleCastMediaHost}. */
export interface GoogleCastMedia extends GoogleCastMediaProps {
  /** RemotePlayback implementation routed through Google Cast. */
  readonly remote: RemotePlayback | RemotePlaybackLike | undefined;
  /** Resolved options passed to the Cast framework on init. */
  readonly castOptions: CastOptions;
  /** Poster image URL forwarded to the receiver. */
  poster: string;
  /** Title forwarded to the receiver. */
  title: string;
}

/** Concrete `HTMLMediaElement`-like contract produced by mixing {@link GoogleCastMedia} into a host. */
export type GoogleCastMediaElement = GoogleCastMediaHost & GoogleCastMedia;

/** Constructor signature for any {@link GoogleCastMediaHost} subclass. */
export interface GoogleCastMediaHostConstructor {
  /** Construct an instance. */
  new (...args: any[]): GoogleCastMediaHost;
}
