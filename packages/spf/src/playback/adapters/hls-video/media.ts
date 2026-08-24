import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { MediaTracksMixin } from '@videojs/media/media-tracks';
import { HlsVideoMediaMixin } from './adapter';
import { HlsVideoMediaMediaTracksMixin } from './media-tracks';
import { HLS_VIDEO_MEDIA } from './predicate';

const HlsVideoMediaBase = HlsVideoMediaMediaTracksMixin(MediaTracksMixin(HlsVideoMediaMixin(HTMLVideoElementHost)));

export class HlsVideoMedia extends HlsVideoMediaBase {
  readonly [HLS_VIDEO_MEDIA] = true;
}
