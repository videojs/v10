import { HTMLAudioElementHost } from '@videojs/media/dom/audio-host';
import { SimpleHlsAudioOnlyMediaMixin } from './adapter';

const SimpleHlsAudioOnlyMediaBase = SimpleHlsAudioOnlyMediaMixin(HTMLAudioElementHost);

export class SimpleHlsAudioOnlyMedia extends SimpleHlsAudioOnlyMediaBase {}
