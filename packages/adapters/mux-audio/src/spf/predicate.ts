import { isBrandedMedia } from '@videojs/media';

import type { MuxAudioAdapter } from './adapter';

export const MUX_AUDIO_SPF_MEDIA = '@videojs/mux-audio/spf';

/**
 * Whether `value` is Mux audio over Video.js's own engine: this entry's `MuxAudioAdapter`, or a media element built on
 * one. Narrows `engine` to the engine composition. Mux audio over hls.js answers to the `isMuxAudioMedia` from
 * `@videojs/mux-audio` instead.
 */
export function isMuxAudioMedia(value: unknown): value is MuxAudioAdapter {
  return isBrandedMedia(value, MUX_AUDIO_SPF_MEDIA);
}
