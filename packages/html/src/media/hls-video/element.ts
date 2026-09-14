import { HlsVideoAdapter } from '@videojs/spf/hls-video';

import { createMediaElement, videoTarget } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class HlsVideoElement extends createMediaElement({ Adapter: HlsVideoAdapter, target: videoTarget }) {
  static readonly tagName = 'hls-video';
}
