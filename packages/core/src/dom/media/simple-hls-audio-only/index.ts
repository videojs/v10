import { SimpleHlsAudioOnlyMediaMixin } from '@videojs/spf/hls';
import { HTMLAudioElementHost } from '../audio-host';

const SimpleHlsAudioOnlyMediaBase = SimpleHlsAudioOnlyMediaMixin(HTMLAudioElementHost);

export class SimpleHlsAudioOnlyMedia extends SimpleHlsAudioOnlyMediaBase {}
