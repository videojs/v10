import type { RemotePlayback } from './remote-playback';
import type { CastOptions } from './utils';

export interface CastableMediaBase extends EventTarget {
  readonly target: HTMLMediaElement | null;
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

export interface CastableMediaProps {
  readonly remote: RemotePlayback | undefined;
  readonly castOptions: CastOptions;
  castReceiver: string | undefined;
  castSrc: string;
  castContentType: string | undefined;
  castStreamType: string | undefined;
  castCustomData: Record<string, unknown> | null | undefined;
  poster: string;
  title: string;
}

export type CastableMediaElement = CastableMediaBase & CastableMediaProps;

export interface CastableMediaSuperclass {
  new (...args: any[]): CastableMediaBase;
}
