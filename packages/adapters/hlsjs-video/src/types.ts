import type { HTMLVideoAdapter } from '@videojs/media/dom';
import type Hls from 'hls.js';

export type HlsPlaylistTypes = 'VOD' | 'EVENT' | null | undefined;

export type HlsEngineHost = HTMLVideoAdapter & {
  readonly engine?: Hls | null;
};
