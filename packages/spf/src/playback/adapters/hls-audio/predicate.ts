import { isBrandedMedia } from '@videojs/media';

import type { HlsAudioAdapter } from './adapter';

export const HLS_AUDIO_BRAND = '@videojs/spf/hls-audio';

/**
 * Whether `value` is HLS audio on Video.js's own engine: an `HlsAudioAdapter`, or a media element built on one. The SPF
 * flavor of Mux audio counts too. Narrows `engine` to the engine composition.
 */
export function isHlsAudioAdapter(value: unknown): value is HlsAudioAdapter {
  return isBrandedMedia(value, HLS_AUDIO_BRAND);
}
