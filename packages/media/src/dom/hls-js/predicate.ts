import { isObject } from '@videojs/utils/predicate';
import type { HlsJsMedia } from './media';

export const HLS_JS_MEDIA = Symbol.for('@videojs/media/hls-js');

/**
 * Check whether a value is an `HlsJsMedia` or one of its subclasses.
 *
 * @param value - Value to identify.
 */
export function isHlsJsMedia(value: unknown): value is HlsJsMedia {
  return isObject(value) && HLS_JS_MEDIA in value;
}
