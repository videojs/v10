import { NativeHlsAdapter } from '@videojs/native-hls-video';

import { createMediaElement, videoTarget } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class NativeHlsVideoElement extends createMediaElement({ Adapter: NativeHlsAdapter, target: videoTarget }) {
  static readonly tagName = 'native-hls-video';
}
