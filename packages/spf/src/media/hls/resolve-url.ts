/** Resolve a potentially relative URL against a base URL using native URL API. */
export function resolveUrl(url: string, baseUrl: string): string {
  return new URL(url, baseUrl).href;
}

/**
 * How an `EXT-X-KEY` URI is turned into the value carried on the parsed key. Supplied as engine config so a source
 * whose provider names keys some other way can rewrite them — proxying `identity` key requests, say.
 */
export type ResolveKeyUri = (uri: string, baseUrl: string) => string;

/**
 * Default {@link ResolveKeyUri}: resolve only what names a fetchable resource, and hand anything opaque back untouched.
 *
 * Only `METHOD=AES-128` / `SAMPLE-AES` with `KEYFORMAT="identity"` points at a key file that may be written relative to
 * the playlist. Every DRM key system instead carries an _identifier_ — a `data:` PSSH/PlayReady payload, a FairPlay
 * `skd://` — and resolving those is at best lossy. It is also unsafe: FairPlay's common `skd://<keyid>:<iv>` form makes
 * `new URL` read the IV as a port, which is not numeric, so it throws and takes the whole playlist parse down with it.
 */
export function resolveKeyUri(uri: string, baseUrl: string): string {
  // Any scheme other than http(s) is an opaque identifier, not a location.
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri) && !/^https?:/i.test(uri)) return uri;

  try {
    return resolveUrl(uri, baseUrl);
  } catch {
    // A key URI we cannot resolve is still worth carrying verbatim: it may be all
    // a key system needs, and losing the whole rendition over it helps no one.
    return uri;
  }
}
