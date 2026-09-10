import { ShakaAdapter } from '@videojs/shaka-video';

import { createMediaElement, videoHost } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class ShakaVideoElement extends createMediaElement({ Adapter: ShakaAdapter, host: videoHost }) {
  static readonly tagName = 'shaka-video';
}
