import { isObject } from '@videojs/utils/predicate';
import type { YouTubeMedia } from './media';

export const YOUTUBE_MEDIA = Symbol.for('@videojs/media/youtube');

/**
 * Check whether a value is a `YouTubeMedia`.
 *
 * @param value - Value to identify.
 */
export function isYouTubeMedia(value: unknown): value is YouTubeMedia {
  return isObject(value) && YOUTUBE_MEDIA in value;
}
