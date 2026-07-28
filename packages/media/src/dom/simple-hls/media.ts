import { SimpleHlsMediaMixin } from '@videojs/spf/hls';
import { HTMLVideoElementHost } from '../video-host';

const SimpleHlsMediaBase = SimpleHlsMediaMixin(HTMLVideoElementHost);

export class SimpleHlsMedia extends SimpleHlsMediaBase {}
