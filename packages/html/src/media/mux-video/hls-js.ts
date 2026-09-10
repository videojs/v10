import { MuxVideoAdapter } from '@videojs/mux-video';

import { createMediaElement, videoHost } from '../create-media-element';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(createMediaElement({ Adapter: MuxVideoAdapter, host: videoHost }));

/**
 * @mediaType video
 * @mediaTarget video
 */
export class MuxVideoElement extends MuxVideoBase {
  static readonly tagName = 'mux-video';
}
