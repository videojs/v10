import { MuxAudioAdapter } from '@videojs/mux-audio';

import { createMediaElement } from '../create-media-element';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(createMediaElement(MuxAudioAdapter));

export class MuxAudioElement extends MuxAudioBase {
  static readonly tagName = 'mux-audio';
}
