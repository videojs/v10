import type Hls from 'hls.js';
import type { HTMLVideoElementHost } from '../video-host';

export type HlsPlaylistTypes = 'VOD' | 'EVENT' | null | undefined;

// Class-based so mixins applied to an `HTMLVideoElementHost` subclass retain
// access to the protected `target`, which is no longer part of any public type.
export type HlsEngineHost = HTMLVideoElementHost & {
  readonly engine?: Hls | null;
};
