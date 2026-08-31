import { MediaTracksMixin } from '@videojs/media/media-tracks';

import { HlsVideoMediaMixin } from './adapter';
import { SpfVideoHost } from './host';
import { HlsVideoMediaMediaTracksMixin } from './media-tracks';

const HlsVideoMediaBase = HlsVideoMediaMediaTracksMixin(MediaTracksMixin(HlsVideoMediaMixin(SpfVideoHost)));

export class HlsVideoMedia extends HlsVideoMediaBase {}
