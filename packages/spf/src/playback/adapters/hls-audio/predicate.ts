import { isObject } from '@videojs/utils/predicate';
import type { HlsAudioMedia } from './media';

export const HLS_AUDIO_MEDIA = Symbol.for('@videojs/spf/hls-audio');

/**
 * Check whether a value is an `HlsAudioMedia`.
 *
 * @param value - Value to identify.
 */
export function isHlsAudioMedia(value: unknown): value is HlsAudioMedia {
  return isObject(value) && HLS_AUDIO_MEDIA in value;
}
