import { isBrandedMedia } from '@videojs/media';

import type { MuxAudioAdapter } from './index';

export const MUX_AUDIO_MEDIA = '@videojs/mux-audio';

/**
 * Whether `value` is Mux audio over hls.js: this entry's `MuxAudioAdapter`, or a media element built on one. Narrows
 * `engine` to the hls.js instance. Mux audio over Video.js's own engine answers to the `isMuxAudioMedia` from
 * `@videojs/mux-audio/spf` instead.
 */
export function isMuxAudioMedia(value: unknown): value is MuxAudioAdapter {
  return isBrandedMedia(value, MUX_AUDIO_MEDIA);
}
