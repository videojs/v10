import { HTMLVideoAdapter } from '@videojs/media/dom';
import { MediaTracksMixin } from '@videojs/media/media-tracks';

import { HlsVideoMediaTracksMixin } from './media-tracks';
import { HlsVideoMixin } from './mixin';

const HlsVideoAdapterBase = HlsVideoMediaTracksMixin(MediaTracksMixin(HlsVideoMixin(HTMLVideoAdapter)));

export class HlsVideoAdapter extends HlsVideoAdapterBase {}
