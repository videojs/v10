import { HlsVideoAdapter } from '@videojs/spf/hls-video';

import { createMediaElement } from '../create-media-element';

export class HlsVideoElement extends createMediaElement(HlsVideoAdapter) {
  static readonly tagName = 'hls-video';
}
