import { isObject } from '@videojs/utils/predicate';
import type { HlsVideoMedia } from './media';

export const HLS_VIDEO_MEDIA = Symbol.for('@videojs/spf/hls-video');

/**
 * Check whether a value is an `HlsVideoMedia`.
 *
 * @param value - Value to identify.
 */
export function isHlsVideoMedia(value: unknown): value is HlsVideoMedia {
  return isObject(value) && HLS_VIDEO_MEDIA in value;
}
