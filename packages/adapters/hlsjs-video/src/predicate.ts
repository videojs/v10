import { isBrandedMedia } from '@videojs/media';

import type { HlsJsAdapter } from './adapter';

export const HLS_JS_MEDIA = '@videojs/hlsjs-video';

/**
 * Whether `value` is hls.js media: an `HlsJsAdapter`, or a media element built on one. The hls.js flavors of Mux video
 * and Mux audio count too. Narrows `engine` to the hls.js instance, which is `null` while the browser's own HLS plays.
 */
export function isHlsJsMedia(value: unknown): value is HlsJsAdapter {
  return isBrandedMedia(value, HLS_JS_MEDIA);
}
