import { NativeHlsAdapter } from '@videojs/native-hls-video';

import { createMediaElement, videoHost } from '../create-media-element';

/**
 * @mediaType video
 * @mediaTarget video
 */
export class NativeHlsVideoElement extends createMediaElement({ Adapter: NativeHlsAdapter, host: videoHost }) {
  static readonly tagName = 'native-hls-video';
}
