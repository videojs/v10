import { isUndefined } from '@videojs/utils/predicate';
import { getMediaPlaylistMetadata, isResolvedTrack, type Presentation, type Track } from './types';

/**
 * The presentation's live timeline anchor: the wall-clock (PDT, epoch seconds)
 * that corresponds to **media-time 0**. One such value is shared across every
 * track — establish it from one track and any other track positions itself by
 * its own per-segment PDT. See
 * [live-presentation-anchor](../../../internal/decisions/live-presentation-anchor.md).
 *
 * It is exactly the `Track.startDate` concept (wall clock at the timeline
 * origin), promoted from per-track to presentation-level.
 */
export type PresentationAnchor = number;

/**
 * Derive the presentation anchor from a buffer pin — the authoritative source.
 * Given a segment present in the track and where it *actually* landed in the
 * SourceBuffer (`actualStart`, native PTS), the wall clock at media-time 0 is
 * `segment.startDate − actualStart` (both along the linear timeline). `undefined`
 * when the segment isn't present or carries no PDT.
 */
export function presentationAnchorFromBuffer(
  track: Track,
  segmentId: string,
  actualStart: number
): PresentationAnchor | undefined {
  const segment = track.segments.find((s) => s.id === segmentId);
  if (!segment || isUndefined(segment.startDate)) return undefined;
  return segment.startDate - actualStart;
}

export interface PresentationAnchorEstimateOptions {
  /**
   * Sequence number assumed to be the stream's origin (time 0). Defaults to 0.
   * See {@link presentationAnchorEstimate}.
   */
  presumedStartSequence?: number;
}

/**
 * Estimate the presentation anchor from the manifest alone — the pre-buffer
 * bootstrap, superseded by {@link presentationAnchorFromBuffer} once ground
 * truth exists. A mid-join live playlist omits earlier segments, so the unseen
 * origin's distance is estimated from the observed segments' **average**
 * duration (more reliable than the target duration, a spec ceiling). The wall
 * clock at media-time 0 is the anchor segment's PDT minus its estimated
 * stream-origin offset, `(sequence − presumedStartSequence) × averageDuration`.
 *
 * ROUGH and provisional — assumes roughly-uniform durations and no
 * discontinuities in the unseen past; error grows with the sequence gap.
 * `undefined` when no segment carries PDT.
 *
 * TODO: the `mediaSequence` read is the remaining HLS coupling (a segment's
 * ordinal-from-origin); neutralize it behind a format-neutral segment-position
 * abstraction so DASH can supply its own (tracked separately).
 */
export function presentationAnchorEstimate(
  track: Track,
  { presumedStartSequence = 0 }: PresentationAnchorEstimateOptions = {}
): PresentationAnchor | undefined {
  const { segments } = track;
  const anchorIndex = segments.findIndex((segment) => !isUndefined(segment.startDate));
  const anchor = segments[anchorIndex];
  if (!anchor || isUndefined(anchor.startDate)) return undefined;

  const mediaSequence = getMediaPlaylistMetadata(track)?.mediaSequence ?? 0;
  const anchorSequence = mediaSequence + anchorIndex;
  const averageDuration = segments.reduce((sum, segment) => sum + segment.duration, 0) / segments.length;
  const originOffset = (anchorSequence - presumedStartSequence) * averageDuration;
  return anchor.startDate - originOffset;
}

/**
 * Re-origin a track's timeline so media-time 0 coincides with the shared
 * presentation `anchor` (PDT at the origin). The track shifts by
 * `track.startDate − anchor` — its own per-segment PDT carries it onto the
 * shared timeline, so one anchor positions every track without a second buffer
 * read. (Under the no-inter-track-skew assumption all tracks share the PTS
 * clock; see the decision doc.)
 *
 * Segment `startDate` (intrinsic PDT) stays put; only timeline positions move.
 * No-op when the track has no PDT origin (`startDate` undefined) or is already
 * on the anchor — so callers can apply it unconditionally.
 */
export function positionTrackToAnchor<Tracks extends Track>(track: Tracks, anchor: PresentationAnchor): Tracks {
  if (isUndefined(track.startDate)) return track;

  const shift = track.startDate - anchor;
  if (shift === 0) return track;

  return {
    ...track,
    startTime: track.startTime + shift,
    startDate: anchor,
    segments: track.segments.map((segment) => ({ ...segment, startTime: segment.startTime + shift })),
  };
}

/**
 * Position **every** track in a presentation onto the shared `anchor`, in one
 * pass. A resolved track has its segment timeline shifted
 * ({@link positionTrackToAnchor}); a not-yet-resolved shell gets the anchor
 * stamped as `startDate`, so the media-playlist parser places its segments on
 * the shared timeline at first resolve (`placeOnAnchor`). Because it covers
 * unselected renditions too, any track selected later — an ABR rung, another
 * audio language, late captions — is already anchored without a per-track
 * positioning pass.
 *
 * Identity-preserving: returns the same presentation when nothing moved (every
 * track already on the anchor), so an idempotent re-establish writes no new
 * reference.
 */
export function positionAllTracksToAnchor(presentation: Presentation, anchor: PresentationAnchor): Presentation {
  let changed = false;
  const selectionSets = presentation.selectionSets.map((selectionSet) => ({
    ...selectionSet,
    switchingSets: selectionSet.switchingSets.map((switchingSet) => ({
      ...switchingSet,
      tracks: switchingSet.tracks.map((track) => {
        // Resolved → shift segments; shell → stamp the anchor for the parser.
        const next = isResolvedTrack(track)
          ? positionTrackToAnchor(track, anchor)
          : track.startDate === anchor
            ? track
            : { ...track, startDate: anchor };
        if (next !== track) changed = true;
        return next;
      }),
    })),
  }));
  return changed ? ({ ...presentation, selectionSets } as Presentation) : presentation;
}
