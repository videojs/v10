/**
 * The values a media element's `crossorigin` attribute takes. The empty string is the bare attribute (`<video
 * crossorigin>`), which the CORS-settings attribute rules read as `anonymous`; `null` is no attribute.
 */
export type MediaCrossOrigin = '' | 'anonymous' | 'use-credentials';

/**
 * Map a media element's CORS-settings attribute (`crossorigin`) to the `credentials` mode the engine's own requests
 * should carry.
 *
 * Only `use-credentials` asks for anything: it maps to `'include'`, the mode the browser itself fetches the element's
 * resources with, so a cookie-gated cross-origin stream works the same whether the browser or the engine loads it.
 * `anonymous`, the bare attribute, and no attribute yield `undefined`, leaving the platform default (`same-origin`).
 *
 * The attribute-absent case deliberately does not map to `'include'` even though the browser's own no-CORS media
 * fetches send cookies: `fetch` cannot use no-CORS here (bodies must be readable), and a credentialed CORS request is
 * refused by any server answering `Access-Control-Allow-Origin: *`, which would break every stream that works today.
 */
export function crossOriginToRequestCredentials(
  crossOrigin: MediaCrossOrigin | null | undefined
): RequestCredentials | undefined {
  return crossOrigin === 'use-credentials' ? 'include' : undefined;
}
