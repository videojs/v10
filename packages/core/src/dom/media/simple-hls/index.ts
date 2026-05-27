import { SimpleHlsMediaMixin } from '@videojs/spf/hls';
import { HTMLVideoElementHost } from '../html-video-element-host';

export class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}
