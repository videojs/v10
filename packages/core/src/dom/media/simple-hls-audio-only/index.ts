import { SimpleHlsAudioOnlyMediaMixin } from '@videojs/spf/hls';
import { HTMLAudioElementHost } from '../audio-host';

export class SimpleHlsAudioOnlyMedia extends SimpleHlsAudioOnlyMediaMixin(HTMLAudioElementHost) {}
