import { MuxAudioAdapter } from '@videojs/mux-audio';

import { audioHost, createMediaElement } from '../create-media-element';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(createMediaElement({ Adapter: MuxAudioAdapter, host: audioHost }));

/**
 * @mediaType audio
 * @mediaTarget audio
 */
export class MuxAudioElement extends MuxAudioBase {
  static readonly tagName = 'mux-audio';
}
