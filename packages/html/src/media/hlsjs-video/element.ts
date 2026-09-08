import { HlsJsAdapter } from '@videojs/hlsjs-video';

import { createMediaElement } from '../create-media-element';

export class HlsJsVideoElement extends createMediaElement(HlsJsAdapter) {
  static readonly tagName = 'hlsjs-video';
}
