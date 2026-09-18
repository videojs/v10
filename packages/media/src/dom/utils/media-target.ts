import { isObject } from '@videojs/utils/predicate';

import { type AnyHTMLMediaAdapter, HTMLMediaAdapter } from '../html-media-adapter';

/**
 * The media adapter behind a media the player resolved: the adapter itself, or the one a custom media element such as
 * `<mux-video>` exposes as `adapter`. `null` for a plain `<video>` / `<audio>` or an unrelated media implementation.
 */
export function getMediaAdapter(media: unknown): AnyHTMLMediaAdapter | null {
  if (media instanceof HTMLMediaAdapter) return media;

  const adapter = isObject(media) ? (media as { adapter?: unknown }).adapter : null;

  return adapter instanceof HTMLMediaAdapter ? adapter : null;
}

/**
 * The native element behind a media the player resolved: the element itself, or the one a custom media element or
 * adapter fronts as `target`. `null` when the media is not backed by an `HTMLMediaElement` (an embed, for example).
 */
export function getMediaElement(media: unknown): HTMLMediaElement | null {
  if (media instanceof HTMLMediaElement) return media;

  // `HTMLMediaAdapter.target` is protected in TypeScript, but exists at runtime on it and on custom media elements.
  const target = isObject(media) ? (media as { target?: unknown }).target : null;

  return target instanceof HTMLMediaElement ? target : null;
}
