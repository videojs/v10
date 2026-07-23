import { SimpleHlsMediaMixin } from '@videojs/spf/hls';
import { MediaTracksMixin } from '../../../core/media/media-tracks';
import { HTMLVideoElementHost } from '../video-host';
import { SimpleHlsMediaMediaTracksMixin } from './media-tracks';

const SimpleHlsMediaBase = SimpleHlsMediaMediaTracksMixin(MediaTracksMixin(SimpleHlsMediaMixin(HTMLVideoElementHost)));

export class SimpleHlsMedia extends SimpleHlsMediaBase {}
