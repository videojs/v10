import { ShakaAdapter } from '@videojs/shaka-video';

import { createMediaElement } from '../create-media-element';

export class ShakaVideoElement extends createMediaElement(ShakaAdapter) {
  static readonly tagName = 'shaka-video';
}
