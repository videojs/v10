import { MuxAudioAdapter } from '@videojs/mux-audio';

import { audioTarget, createMediaElement } from '../create-media-element';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(createMediaElement({ Adapter: MuxAudioAdapter, target: audioTarget }));

/**
 * @mediaType audio
 * @mediaTarget audio
 */
export class MuxAudioElement extends MuxAudioBase {
  static readonly tagName = 'mux-audio';
}
