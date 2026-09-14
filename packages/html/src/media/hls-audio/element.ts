import { HlsAudioAdapter } from '@videojs/spf/hls-audio';

import { audioTarget, createMediaElement } from '../create-media-element';

/**
 * @mediaType audio
 * @mediaTarget audio
 */
export class HlsAudioElement extends createMediaElement({ Adapter: HlsAudioAdapter, target: audioTarget }) {
  static readonly tagName = 'hls-audio';
}
