import type Hls from 'hls.js';
import type { HTMLVideoElementHost } from '../video-host';

export type HlsPlaylistTypes = 'VOD' | 'EVENT' | null | undefined;

export type HlsEngineHost = HTMLVideoElementHost & {
  readonly engine?: Hls | null;
};
