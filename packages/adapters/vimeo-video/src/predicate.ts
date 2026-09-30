import { isBrandedMedia } from '@videojs/media';

import type { VimeoAdapter } from './adapter';

export const VIMEO_BRAND = '@videojs/vimeo-video';

/**
 * Whether `value` is Vimeo media: a `VimeoAdapter`, or a media element built on one. Narrows `engine` to the Vimeo
 * player.
 */
export function isVimeoAdapter(value: unknown): value is VimeoAdapter {
  return isBrandedMedia(value, VIMEO_BRAND);
}
