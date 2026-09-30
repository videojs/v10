import { isBrandedMedia } from '@videojs/media';

import type { TwitchAdapter } from './adapter';

export const TWITCH_BRAND = '@videojs/twitch-video';

/** Whether `value` is Twitch media: a `TwitchAdapter`, or a media element built on one. */
export function isTwitchAdapter(value: unknown): value is TwitchAdapter {
  return isBrandedMedia(value, TWITCH_BRAND);
}
