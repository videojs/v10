import { isBrandedMedia } from '@videojs/media';

import type { NativeHlsAdapter } from './adapter';

export const NATIVE_HLS_BRAND = '@videojs/native-hls-video';

/**
 * Whether `value` is native HLS media, which hands HLS playback to the browser: a `NativeHlsAdapter`, or a media
 * element built on one.
 */
export function isNativeHlsAdapter(value: unknown): value is NativeHlsAdapter {
  return isBrandedMedia(value, NATIVE_HLS_BRAND);
}
