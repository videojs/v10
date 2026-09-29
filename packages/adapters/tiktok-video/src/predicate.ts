import { isBrandedMedia } from '@videojs/media';

import type { TikTokAdapter } from './adapter';

export const TIKTOK_MEDIA = '@videojs/tiktok-video';

/** Whether `value` is TikTok media: a `TikTokAdapter`, or a media element built on one. */
export function isTikTokMedia(value: unknown): value is TikTokAdapter {
  return isBrandedMedia(value, TIKTOK_MEDIA);
}
