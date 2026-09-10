import { HlsJsAdapter } from '@videojs/hlsjs-video';

import { createMediaElement, videoHost } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class HlsJsVideoElement extends createMediaElement({ Adapter: HlsJsAdapter, host: videoHost }) {
  static readonly tagName = 'hlsjs-video';
}
