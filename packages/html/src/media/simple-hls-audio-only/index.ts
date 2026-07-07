import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { SimpleHlsAudioOnlyMedia } from '@videojs/core/dom/media/simple-hls-audio-only';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class SimpleHlsAudioOnly extends MediaAttachMixin(CustomMediaElement('audio', SimpleHlsAudioOnlyMedia)) {}
