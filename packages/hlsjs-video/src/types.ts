import type { HTMLVideoElementHost } from '@videojs/media/dom';
import type Hls from 'hls.js';

export type HlsPlaylistTypes = 'VOD' | 'EVENT' | null | undefined;

export type HlsEngineHost = HTMLVideoElementHost & {
  readonly engine?: Hls | null;
};
