import { isNil } from '@videojs/utils/predicate';

/**
 * The values a media element's `crossorigin` attribute takes. The empty string is the bare attribute (`<video
 * crossorigin>`), which the CORS-settings attribute rules read as `anonymous`; `null` is no attribute.
 */
export type MediaCrossOrigin = '' | 'anonymous' | 'use-credentials';

/**
 * Normalize a `crossorigin` value the way the element's IDL attribute reflects it — "limited to only known values":
 * missing stays `null`; `use-credentials` in any ASCII case is itself; everything else, the empty string and unknown
 * keywords included, is `anonymous`. A custom element delivers the raw attribute string, so this is where author
 * spelling is settled.
 */
export function normalizeCrossOrigin(value: string | null | undefined): Exclude<MediaCrossOrigin, ''> | null {
  if (isNil(value)) return null;

  return value.toLowerCase() === 'use-credentials' ? 'use-credentials' : 'anonymous';
}

/**
 * Map a media element's CORS-settings attribute (`crossorigin`) to the `credentials` mode the engine's own requests
 * should carry. Expects a normalized value (see {@link normalizeCrossOrigin}).
 *
 * Only `use-credentials` asks for anything: it maps to `'include'`, the mode the browser itself fetches the element's
 * resources with, so a cookie-gated cross-origin stream works the same whether the browser or the engine loads it.
 * `anonymous` and no attribute yield `undefined`, leaving the platform default (`same-origin`).
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
