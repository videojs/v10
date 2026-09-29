import { isBrandedMedia } from '@videojs/media';

import type { MuxVideoAdapter } from './adapter';

export const MUX_VIDEO_SPF_MEDIA = '@videojs/mux-video/spf';

/**
 * Whether `value` is Mux video over Video.js's own engine: this entry's `MuxVideoAdapter`, or a media element built on
 * one. Narrows `engine` to the engine composition. Mux video over hls.js answers to the `isMuxVideoMedia` from
 * `@videojs/mux-video` instead.
 */
export function isMuxVideoMedia(value: unknown): value is MuxVideoAdapter {
  return isBrandedMedia(value, MUX_VIDEO_SPF_MEDIA);
}
