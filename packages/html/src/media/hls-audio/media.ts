import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { HlsAudioMedia } from '@videojs/spf/hls-audio';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsAudio extends MediaAttachMixin(CustomMediaElement('audio', HlsAudioMedia)) {}
