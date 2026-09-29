import { isBrandedMedia } from '@videojs/media';

import type { TwitchAdapter } from './adapter';

export const TWITCH_MEDIA = '@videojs/twitch-video';

/** Whether `value` is Twitch media: a `TwitchAdapter`, or a media element built on one. */
export function isTwitchMedia(value: unknown): value is TwitchAdapter {
  return isBrandedMedia(value, TWITCH_MEDIA);
}
