import { isObject } from '@videojs/utils/predicate';
import type { NativeHlsMedia } from './media';

export const NATIVE_HLS_MEDIA = Symbol.for('@videojs/media/native-hls');

/**
 * Check whether a value is a `NativeHlsMedia`.
 *
 * @param value - Value to identify.
 */
export function isNativeHlsMedia(value: unknown): value is NativeHlsMedia {
  return isObject(value) && NATIVE_HLS_MEDIA in value;
}
