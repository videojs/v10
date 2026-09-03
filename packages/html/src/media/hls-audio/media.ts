import { CustomMediaElement } from '@videojs/media/dom';
import { HlsAudioMedia } from '@videojs/spf/hls-audio';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsAudio extends MediaAttachMixin(CustomMediaElement('audio', HlsAudioMedia)) {}
