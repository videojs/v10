import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { MediaTracksMixin } from '@videojs/media/media-tracks';
import { SimpleHlsMediaMixin } from './adapter';
import { SimpleHlsMediaMediaTracksMixin } from './media-tracks';

const SimpleHlsMediaBase = SimpleHlsMediaMediaTracksMixin(MediaTracksMixin(SimpleHlsMediaMixin(HTMLVideoElementHost)));

export class SimpleHlsMedia extends SimpleHlsMediaBase {}
