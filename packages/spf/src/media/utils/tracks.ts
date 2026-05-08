import type {
  MaybeResolvedPresentation,
  PartiallyResolvedTrack,
  Presentation,
  ResolvedTrack,
  TrackType,
} from '../types';

/**
 * Get the tracks of the given type from a presentation's first switching set.
 *
 * Returns `[]` when the presentation is unresolved, when no selection set of
 * `type` exists, or when its first switching set is empty. Returned tracks may
 * be partially resolved (URL only) or fully resolved (with segments) — callers
 * narrow as needed.
 *
 * The "first switching set" assumption matches the rest of the codebase
 * (HLS typically has one switching set per type); multi-group / multi-period
 * support would generalize this.
 */
export function getTracksByType(
  presentation: MaybeResolvedPresentation,
  type: TrackType
): readonly (PartiallyResolvedTrack | ResolvedTrack)[] {
  return presentation.selectionSets?.find(({ type: t }) => t === type)?.switchingSets[0]?.tracks ?? [];
}

/**
 * Find a track of the given type and id within a presentation.
 *
 * Returns the matching track from the first switching set of the matching
 * selection set, or `undefined` if either is missing. The returned track may
 * be partially resolved (URL only) or fully resolved (with segments) — callers
 * narrow as needed.
 */
export function findTrack(
  presentation: MaybeResolvedPresentation,
  type: TrackType,
  trackId: string
): PartiallyResolvedTrack | ResolvedTrack | undefined {
  return getTracksByType(presentation, type).find(({ id }) => id === trackId);
}

/**
 * Updates a track within a presentation (immutably). Generic — works for
 * video, audio, or text tracks.
 */
export function updateTrackInPresentation<T extends ResolvedTrack>(
  presentation: Presentation,
  resolvedTrack: T
): Presentation {
  const trackId = resolvedTrack.id;
  return {
    ...presentation,
    selectionSets: presentation.selectionSets.map((selectionSet) => ({
      ...selectionSet,
      switchingSets: selectionSet.switchingSets.map((switchingSet) => ({
        ...switchingSet,
        tracks: switchingSet.tracks.map((track) => (track.id === trackId ? resolvedTrack : track)),
      })),
    })),
  } as Presentation;
}
