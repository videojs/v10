/**
 * Key a media facade answers with the media it wraps. `Symbol.for` so a page carrying two copies of the packages (CDN
 * plus npm, duplicate installs) still agrees on it, and so it can never collide with a media member.
 *
 * @internal
 */
export const RAW_MEDIA: unique symbol = Symbol.for('@videojs/media/raw');

/**
 * The media behind a player facade, or `media` itself when it isn't one. Identity checks and native-element lookups
 * must go through this: a facade passes `instanceof` for the element it wraps but is never identical to it.
 *
 * @internal
 */
export function unwrapMedia<T>(media: T): T {
  // SAFETY: only a facade answers `RAW_MEDIA`, and it answers with the `T` it wraps; anything else reads `undefined`.
  return (media as { [RAW_MEDIA]?: T } | null | undefined)?.[RAW_MEDIA] ?? media;
}
