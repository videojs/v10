import { isBrandedMedia } from '@videojs/media';

import type { HlsBackgroundVideoAdapter } from './adapter';

export const HLS_BACKGROUND_VIDEO_MEDIA = '@videojs/spf/hls-background-video';

/**
 * Whether `value` is HLS background video: an `HlsBackgroundVideoAdapter`. `<hls-background-video>` and
 * `<mux-background-video>` keep theirs private and register it as the player's media, so check the media the player
 * holds rather than the element. Narrows `engine` to the engine composition.
 */
export function isHlsBackgroundVideoMedia(value: unknown): value is HlsBackgroundVideoAdapter {
  return isBrandedMedia(value, HLS_BACKGROUND_VIDEO_MEDIA);
}
