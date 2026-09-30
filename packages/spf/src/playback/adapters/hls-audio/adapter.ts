import { MEDIA_BRANDS } from '@videojs/media';
import { HTMLAudioAdapter } from '@videojs/media/dom';

import { HlsAudioMixin } from './mixin';
import { HLS_AUDIO_BRAND } from './predicate';

export class HlsAudioAdapter extends HlsAudioMixin(HTMLAudioAdapter) {
  static readonly [MEDIA_BRANDS]: readonly string[] = [HLS_AUDIO_BRAND];
}
