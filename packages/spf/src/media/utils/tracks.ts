import type {
  MaybeResolvedPresentation,
  PartiallyResolvedTrack,
  Presentation,
  ResolvedTrack,
  TrackType,
} from '../types';

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
  return presentation.selectionSets
    ?.find(({ type: t }) => t === type)
    ?.switchingSets[0]?.tracks.find(({ id }) => id === trackId);
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
