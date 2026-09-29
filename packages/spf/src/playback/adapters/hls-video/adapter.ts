import { MEDIA_BRANDS } from '@videojs/media';
import { HTMLVideoAdapter } from '@videojs/media/dom';
import { MediaTracksMixin } from '@videojs/media/media-tracks';

import { HlsVideoMediaTracksMixin } from './media-tracks';
import { HlsVideoMixin } from './mixin';
import { HLS_VIDEO_MEDIA } from './predicate';

const HlsVideoAdapterBase = HlsVideoMediaTracksMixin(MediaTracksMixin(HlsVideoMixin(HTMLVideoAdapter)));

export class HlsVideoAdapter extends HlsVideoAdapterBase {
  static readonly [MEDIA_BRANDS]: readonly string[] = [HLS_VIDEO_MEDIA];
}
