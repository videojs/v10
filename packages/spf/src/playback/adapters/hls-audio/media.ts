import { HTMLAudioElementHost } from '@videojs/media/dom/audio-host';
import { HlsAudioMediaMixin } from './adapter';

const HlsAudioMediaBase = HlsAudioMediaMixin(HTMLAudioElementHost);

export class HlsAudioMedia extends HlsAudioMediaBase {}
