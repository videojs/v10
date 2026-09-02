import { CustomMediaElement } from '@videojs/media/dom';
import { MuxAudioMedia } from '@videojs/mux-audio';

import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(MediaAttachMixin(CustomMediaElement('audio', MuxAudioMedia)));

export class MuxAudio extends MuxAudioBase {}
