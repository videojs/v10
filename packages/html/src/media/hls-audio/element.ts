import { HlsAudioAdapter } from '@videojs/spf/hls-audio';

import { audioHost, createMediaElement } from '../create-media-element';

/**
 * @mediaType audio
 * @mediaTarget audio
 */
export class HlsAudioElement extends createMediaElement({ Adapter: HlsAudioAdapter, host: audioHost }) {
  static readonly tagName = 'hls-audio';
}
