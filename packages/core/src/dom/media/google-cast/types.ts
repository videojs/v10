import type { RemotePlaybackLike } from '../../../core/media/types';
import type { StreamType } from '../hls/index';
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
