import type {
  AudioTrack,
  MaybeResolvedPresentation,
  PartiallyResolvedTrack,
  Presentation,
  ResolvedTrack,
  TextTrack,
  TrackType,
  VideoTrack,
} from '../types';
import { isResolvedTrack } from '../types';

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
 * Find a track by id across all selection sets in a presentation, without
 * knowing its type up front. Used when the caller has a track id obtained
 * from a downstream consumer (e.g. `SourceBufferActor.initTrackId`) and
 * needs to locate the corresponding track in the presentation.
 *
 * Track ids are unique within a presentation per the HLS spec; the first
 * match wins.
 */
export function findTrackById(
  presentation: MaybeResolvedPresentation,
  trackId: string
): PartiallyResolvedTrack | ResolvedTrack | undefined {
  for (const selectionSet of presentation.selectionSets ?? []) {
    const track = selectionSet.switchingSets[0]?.tracks.find(({ id }) => id === trackId);
    if (track) return track;
  }
  return undefined;
}

/**
 * Find a text track of the given id within a presentation and narrow it to
 * the fully-resolved `TextTrack` shape (segments populated). Returns
 * `undefined` if no track matches the id, the matching track isn't a text
 * track, or it hasn't been resolved yet.
 *
 * The segments-non-empty check stays at the call site — a resolved track
 * with zero segments is a valid state, distinct from "ready to load."
 */
export function findResolvedTextTrack(
  presentation: MaybeResolvedPresentation | undefined,
  trackId: string | undefined
): TextTrack | undefined {
  if (!presentation || !trackId) return undefined;
  const track = findTrack(presentation, 'text', trackId);
  // `findTrack` returns the wide union; narrow via discriminant before
  // applying `isResolvedTrack`'s text-specific overload.
  if (!track || track.type !== 'text' || !isResolvedTrack(track)) return undefined;
  return track;
}

export function findResolvedVideoTrack(
  presentation: MaybeResolvedPresentation | undefined,
  trackId: string | undefined
): VideoTrack | undefined {
  if (!presentation || !trackId) return undefined;
  const track = findTrack(presentation, 'video', trackId);
  if (!track || track.type !== 'video' || !isResolvedTrack(track)) return undefined;
  return track;
}

export function findResolvedAudioTrack(
  presentation: MaybeResolvedPresentation | undefined,
  trackId: string | undefined
): AudioTrack | undefined {
  if (!presentation || !trackId) return undefined;
  const track = findTrack(presentation, 'audio', trackId);
  if (!track || track.type !== 'audio' || !isResolvedTrack(track)) return undefined;
  return track;
}

/**
 * Whether a track carries a non-empty `codecs` array. Both partially-
 * resolved and fully-resolved tracks may carry codecs — they come from
 * the multivariant playlist's `EXT-X-STREAM-INF` line, not from the
 * per-type media playlist — so this works at either resolution stage.
 *
 * `TextTrack` doesn't declare a `codecs` field; the `'codecs' in track`
 * check narrows it out for the false branch.
 */
export function hasCodecs(track: PartiallyResolvedTrack | ResolvedTrack | undefined): boolean {
  return !!track && 'codecs' in track && !!track.codecs?.length;
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
