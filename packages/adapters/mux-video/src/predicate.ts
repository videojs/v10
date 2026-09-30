import { isBrandedMedia } from '@videojs/media';

import type { MuxVideoAdapter } from './adapter';

export const MUX_VIDEO_BRAND = '@videojs/mux-video';

/**
 * Whether `value` is Mux video over hls.js: this entry's `MuxVideoAdapter`, or a media element built on one. Narrows
 * `engine` to the hls.js instance. Mux video over Video.js's own engine answers to the `isMuxVideoAdapter` from
 * `@videojs/mux-video/spf` instead.
 */
export function isMuxVideoAdapter(value: unknown): value is MuxVideoAdapter {
  return isBrandedMedia(value, MUX_VIDEO_BRAND);
}
