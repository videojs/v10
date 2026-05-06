import type Hls from 'hls.js';

export type HlsPlaylistTypes = 'VOD' | 'EVENT' | null | undefined;

export interface HlsEngineHost extends EventTarget {
  readonly engine?: Hls | null;
  readonly target?: HTMLMediaElement | null;
}
