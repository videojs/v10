import type Hls from 'hls.js';

export interface HlsEngineHost extends EventTarget {
  readonly engine?: Hls | null;
  readonly target?: HTMLMediaElement | null;
}
