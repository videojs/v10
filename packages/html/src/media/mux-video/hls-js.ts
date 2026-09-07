import { MuxVideoAdapter } from '@videojs/mux-video';

import { createMediaElement } from '../create-media-element';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(createMediaElement(MuxVideoAdapter));

export class MuxVideoElement extends MuxVideoBase {
  static readonly tagName = 'mux-video';
}
