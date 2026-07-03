import { SimpleHlsMediaMixin } from '@videojs/spf/hls';
import { MediaTracksMixin } from '../../../core/media/media-tracks';
import { HTMLVideoElementHost } from '../video-host';
import { SimpleHlsMediaMediaTracksMixin } from './media-tracks';

export class SimpleHlsMedia extends SimpleHlsMediaMediaTracksMixin(
  MediaTracksMixin(SimpleHlsMediaMixin(HTMLVideoElementHost))
) {}
