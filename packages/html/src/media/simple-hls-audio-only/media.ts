import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { SimpleHlsAudioOnlyMedia } from '@videojs/spf/simple-hls-audio-only';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class SimpleHlsAudioOnly extends MediaAttachMixin(CustomMediaElement('audio', SimpleHlsAudioOnlyMedia)) {}
