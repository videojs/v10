import type { RemotePlayback } from './remote-playback';
import type { CastOptions } from './utils';

/**
 * Augments `@types/chromecast-caf-sender` with HLS segment format
 * properties added after the community types were last updated.
 */
declare namespace chrome.cast.media {
  enum HlsSegmentFormat {
    AAC = 'aac',
    AC3 = 'ac3',
    E_AC3 = 'e_ac3',
    FMP4 = 'fmp4',
    MP3 = 'mp3',
    TS = 'ts',
    TS_AAC = 'ts_aac',
  }

  enum HlsVideoSegmentFormat {
    FMP4 = 'fmp4',
    MPEG2_TS = 'mpeg2_ts',
    TS = 'ts',
  }

  interface MediaInfo {
    hlsSegmentFormat?: chrome.cast.media.HlsSegmentFormat;
    hlsVideoSegmentFormat?: chrome.cast.media.HlsVideoSegmentFormat;
  }
}

export interface CastableMediaBase extends EventTarget {
  readonly target: HTMLMediaElement | null;
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
  querySelectorAll(selectors: string): Iterable<Element>;
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
