import { isBrandedMedia } from '@videojs/media';

import type { YouTubeAdapter } from './adapter';

export const YOUTUBE_MEDIA = '@videojs/youtube-video';

/**
 * Whether `value` is YouTube media: a `YouTubeAdapter`, or a media element built on one. Narrows `engine` to the
 * YouTube IFrame player.
 */
export function isYouTubeMedia(value: unknown): value is YouTubeAdapter {
  return isBrandedMedia(value, YOUTUBE_MEDIA);
}
