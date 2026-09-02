import { MuxAudioAdapter } from '@videojs/mux-audio';

import { createMediaElement } from '../create-media-element';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(createMediaElement(MuxAudioAdapter, { tag: 'audio' }));

export class MuxAudio extends MuxAudioBase {}
