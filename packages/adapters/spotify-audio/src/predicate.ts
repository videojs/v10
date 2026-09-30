import { isBrandedMedia } from '@videojs/media';

import type { SpotifyAdapter } from './adapter';

export const SPOTIFY_BRAND = '@videojs/spotify-audio';

/**
 * Whether `value` is Spotify media: a `SpotifyAdapter`, or a media element built on one. Narrows `engine` to the
 * Spotify embed controller.
 */
export function isSpotifyAdapter(value: unknown): value is SpotifyAdapter {
  return isBrandedMedia(value, SPOTIFY_BRAND);
}
