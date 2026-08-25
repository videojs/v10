import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { MuxMedia } from '@videojs/media/dom/mux';

import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(MediaAttachMixin(CustomMediaElement('audio', MuxMedia)));

export class MuxAudio extends MuxAudioBase {}
