import { ShakaAdapter } from '@videojs/shaka-video';

import { createMediaElement, videoTarget } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class ShakaVideoElement extends createMediaElement({ Adapter: ShakaAdapter, target: videoTarget }) {
  static readonly tagName = 'shaka-video';
}
