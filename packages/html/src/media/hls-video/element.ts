import { HlsVideoAdapter } from '@videojs/spf/hls-video';

import { createMediaElement, videoHost } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class HlsVideoElement extends createMediaElement({ Adapter: HlsVideoAdapter, host: videoHost }) {
  static readonly tagName = 'hls-video';
}
