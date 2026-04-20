import type { RemotePlaybackLike } from '../predicate';
import type { RemotePlayback } from './remote-playback';
import type { CastOptions } from './utils';

export interface CastableMediaProps {
  castReceiver: string | undefined;
  castContentType: string | undefined;
  castStreamType: string | undefined;
  castCustomData: Record<string, unknown> | null | undefined;
}

export const castableMediaDefaultProps: CastableMediaProps = {
  castReceiver: undefined,
  castContentType: undefined,
  castStreamType: undefined,
  castCustomData: undefined,
};

export interface CastableMediaHost extends EventTarget {
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
  streamType?: string;
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

export interface CastableMedia extends CastableMediaProps {
  readonly remote: RemotePlayback | RemotePlaybackLike | undefined;
  readonly castOptions: CastOptions;
  castSrc: string;
  poster: string;
  title: string;
}

export type CastableMediaElement = CastableMediaHost & CastableMedia;

export interface CastableMediaHostConstructor {
  new (...args: any[]): CastableMediaHost;
}
