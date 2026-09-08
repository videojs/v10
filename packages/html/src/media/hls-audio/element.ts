import { HlsAudioAdapter } from '@videojs/spf/hls-audio';

import { createMediaElement } from '../create-media-element';

export class HlsAudioElement extends createMediaElement(HlsAudioAdapter) {
  static readonly tagName = 'hls-audio';
}
