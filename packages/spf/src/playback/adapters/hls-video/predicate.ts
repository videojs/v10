import { isBrandedMedia } from '@videojs/media';

import type { HlsVideoAdapter } from './adapter';

export const HLS_VIDEO_MEDIA = '@videojs/spf/hls-video';

/**
 * Whether `value` is HLS video on Video.js's own engine: an `HlsVideoAdapter`, or a media element built on one. The SPF
 * flavor of Mux video counts too. Narrows `engine` to the engine composition.
 */
export function isHlsVideoMedia(value: unknown): value is HlsVideoAdapter {
  return isBrandedMedia(value, HLS_VIDEO_MEDIA);
}
