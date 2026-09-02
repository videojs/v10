import { CustomMediaElement } from '@videojs/media/dom';
import { MuxAudioAdapter } from '@videojs/mux-audio';

import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(MediaAttachMixin(CustomMediaElement('audio', MuxAudioAdapter)));

export class MuxAudio extends MuxAudioBase {}
