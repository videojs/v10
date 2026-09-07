import { NativeHlsAdapter } from '@videojs/native-hls-video';

import { createMediaElement } from '../create-media-element';

export class NativeHlsVideoElement extends createMediaElement(NativeHlsAdapter) {
  static readonly tagName = 'native-hls-video';
}
