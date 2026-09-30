import { isBrandedMedia } from '@videojs/media';

import type { MuxAudioAdapter } from './index';

export const MUX_AUDIO_BRAND = '@videojs/mux-audio';

/**
 * Whether `value` is Mux audio over hls.js: this entry's `MuxAudioAdapter`, or a media element built on one. Narrows
 * `engine` to the hls.js instance. Mux audio over Video.js's own engine answers to the `isMuxAudioAdapter` from
 * `@videojs/mux-audio/spf` instead.
 */
export function isMuxAudioAdapter(value: unknown): value is MuxAudioAdapter {
  return isBrandedMedia(value, MUX_AUDIO_BRAND);
}
