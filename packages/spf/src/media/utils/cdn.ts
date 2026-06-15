import type { MaybeResolvedPresentation, TrackType } from '../types';

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

// Track-type priority for CDN ordering: video first, then audio, then text.
// Selection sets are visited in this order so the head of the returned list is
// always video-derived. `preferActiveCdn` anchors every track type to the
// first CDN with surviving tracks (the head), so this makes "the primary CDN
// is the video CDN" a guarantee of `getOrderedCdnIds` rather than a side effect
// of the order tracks happen to be parsed in.
const CDN_TYPE_PRIORITY: Record<TrackType, number> = { video: 0, audio: 1, text: 2 };

/**
 * The distinct CDNs a presentation's tracks are served from, ordered video CDNs
 * first, then audio, then text (manifest order within a type). The head is the
 * primary CDN — the one a sticky pick defaults to — and is always video-derived
 * when the source has video. Returns `[]` for an unresolved presentation with
 * no tracks.
 *
 * Redundant-stream sources list the same content on multiple hosts (e.g. Mux's
 * `?redundant_streams=true`), so each host contributes its own candidate tracks;
 * this collapses them to the set of CDNs across every track type.
 */
export function getOrderedCdnIds(presentation: MaybeResolvedPresentation): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  // Stable sort keeps manifest order among same-type selection sets.
  const selectionSets = [...(presentation.selectionSets ?? [])].sort(
    (a, b) => CDN_TYPE_PRIORITY[a.type] - CDN_TYPE_PRIORITY[b.type]
  );
  for (const selectionSet of selectionSets) {
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
