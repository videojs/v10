import type { MaybeResolvedPresentation } from '../types';

/**
 * Identify the CDN a URL is served from, used to group redundant-stream
 * variants that point at the same content on different hosts. Defaults to the
 * URL's origin (scheme + host + port); falls back to the raw string when the
 * URL can't be parsed, so the return value is always a stable grouping key.
 *
 * Sub-feature 1 (sticky CDN pick) uses origin-based identity; a more advanced
 * or consumer-configurable derivation can replace this default later.
 */
export function getCdnId(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/**
 * The distinct CDNs a presentation's tracks are served from, in manifest order
 * (first occurrence wins). The head is the primary CDN — the one a sticky pick
 * defaults to. Returns `[]` for an unresolved presentation with no tracks.
 *
 * Redundant-stream sources list the same content on multiple hosts (e.g. Mux's
 * `?redundant_streams=true`), so each host contributes its own candidate tracks;
 * this collapses them to the set of CDNs across every track type.
 */
export function getOrderedCdnIds(presentation: MaybeResolvedPresentation): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const selectionSet of presentation.selectionSets ?? []) {
    for (const switchingSet of selectionSet.switchingSets) {
      for (const track of switchingSet.tracks) {
        const id = getCdnId(track.url);
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return ids;
}
