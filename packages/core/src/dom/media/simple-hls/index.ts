import { SpfMediaMixin } from '@videojs/spf/dom';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleHlsMedia extends SpfMediaMixin(HTMLVideoElementHost) {}
