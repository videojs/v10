import { HTMLAudioElementHost } from '@videojs/media/dom/audio-host';
import { HlsAudioMediaMixin } from './adapter';
import { HLS_AUDIO_MEDIA } from './predicate';

const HlsAudioMediaBase = HlsAudioMediaMixin(HTMLAudioElementHost);

export class HlsAudioMedia extends HlsAudioMediaBase {
  readonly [HLS_AUDIO_MEDIA] = true;
}
