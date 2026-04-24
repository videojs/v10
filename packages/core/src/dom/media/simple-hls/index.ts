import { SpfMediaMixin } from '@videojs/spf/dom';
import { HTMLVideoElementHost } from '../host';

export class SimpleHlsMedia extends SpfMediaMixin(HTMLVideoElementHost) {}
