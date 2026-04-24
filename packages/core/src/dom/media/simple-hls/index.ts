import { SimpleHlsMediaMixin } from '@videojs/spf/hls';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}
