import { SimpleHlsMediaMixin } from '@videojs/spf/hls';
import { HTMLVideoElementHost } from '../video-host';

/** Media adapter backed by SPF's `SimpleHlsMediaMixin` — minimal HLS support without hls.js. */
export class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}
