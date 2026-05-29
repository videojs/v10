import { SimpleHlsAudioOnlyMediaMixin } from '@videojs/spf/hls';
import { HTMLAudioElementHost } from '../html-audio-element-host';

export class SimpleHlsAudioOnlyMedia extends SimpleHlsAudioOnlyMediaMixin(HTMLAudioElementHost) {}
