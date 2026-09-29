import { isBrandedMedia } from '@videojs/media';

import type { ShakaAdapter } from './adapter';

export const SHAKA_MEDIA = '@videojs/shaka-video';

/**
 * Whether `value` is Shaka Player media: a `ShakaAdapter`, or a media element built on one. Narrows `engine` to the
 * Shaka player.
 */
export function isShakaMedia(value: unknown): value is ShakaAdapter {
  return isBrandedMedia(value, SHAKA_MEDIA);
}
