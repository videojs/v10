import { HlsJsAdapter } from '@videojs/hlsjs-video';

import { createMediaElement, videoTarget } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class HlsJsVideoElement extends createMediaElement({ Adapter: HlsJsAdapter, target: videoTarget }) {
  static readonly tagName = 'hlsjs-video';
}
