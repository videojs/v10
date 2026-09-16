import { MuxVideoAdapter } from '@videojs/mux-video';

import { createMediaElement, videoTarget } from '../create-media-element';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(
  createMediaElement({ adapter: { constructor: MuxVideoAdapter }, target: videoTarget })
);

/**
 * @mediaType video
 * @mediaTarget video
 */
export class MuxVideoElement extends MuxVideoBase {
  static readonly tagName = 'mux-video';
}
