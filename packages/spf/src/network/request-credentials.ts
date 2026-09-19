/**
 * Map a media element's CORS-settings attribute (`crossorigin`) to the `credentials` mode the engine's own requests
 * should carry.
 *
 * Only `use-credentials` asks for anything: it maps to `'include'`, the mode the browser itself fetches the element's
 * resources with, so a cookie-gated cross-origin stream works the same whether the browser or the engine loads it.
 * Every other value — `anonymous`, the empty string, an unknown keyword, or no attribute — yields `undefined`, leaving
 * the platform default (`same-origin`).
 *
 * The attribute-absent case deliberately does not map to `'include'` even though the browser's own no-CORS media
 * fetches send cookies: `fetch` cannot use no-CORS here (bodies must be readable), and a credentialed CORS request is
 * refused by any server answering `Access-Control-Allow-Origin: *`, which would break every stream that works today.
 */
export function crossOriginToRequestCredentials(
  crossOrigin: string | null | undefined
): RequestCredentials | undefined {
  return crossOrigin?.toLowerCase() === 'use-credentials' ? 'include' : undefined;
}
