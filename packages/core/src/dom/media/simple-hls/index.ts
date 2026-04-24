import { SpfMediaMixin } from '@videojs/spf/hls';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends SpfMediaMixin(HTMLVideoElementHost) {}
