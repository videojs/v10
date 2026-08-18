import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { MediaTracksMixin } from '@videojs/media/media-tracks';
import { HlsVideoMediaMixin } from './adapter';
import { HlsVideoMediaMediaTracksMixin } from './media-tracks';

const HlsVideoMediaBase = HlsVideoMediaMediaTracksMixin(MediaTracksMixin(HlsVideoMediaMixin(HTMLVideoElementHost)));

export class HlsVideoMedia extends HlsVideoMediaBase {}
