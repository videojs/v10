/**
 * End-of-stream detection helpers.
 *
 * Pure predicates that compare a presentation's last-segment expectations
 * against what an MSE SourceBufferActor has actually appended. Consumed by
 * the `endOfStream` playback behavior to decide when to call
 * `MediaSource.endOfStream()`.
 *
 * Kept here so the layering stays clean: predicates have no `core/`
 * reactivity and operate on a plain `TrackSelectionState` + appended-
 * segments lists extracted by the caller. The caller is responsible for
 * pulling `actor.snapshot.get().context.segments` from each SourceBufferActor
 * — so the helpers stay independent of any `playback/` actor type.
 */

import { isResolvedTrack } from '../../types';
import { getSelectedTrack, type TrackSelectionState } from '../../utils/track-selection';

/**
 * Minimum information about an appended segment needed to decide whether
 * it counts toward end-of-stream readiness.
 *
 * Matches the shape of `SourceBufferActor`'s context segments — callers
 * typically pass `actor.snapshot.get().context.segments` directly.
 */
export interface AppendedSegment {
  id: string;
  /**
   * True while a streaming append is in progress for this segment. A
   * partial segment is still streaming — it does not count as the last
   * segment being ready.
   */
  partial?: boolean;
}

/**
 * Check if the temporally last segment of `expectedSegments` is present in
 * `appendedSegments` and not marked partial.
 *
 * Compares by segment ID rather than by a pipeline flag, so the result
 * stays correct across quality switches (different tracks have different
 * segment IDs) and back-buffer flushes (flushed segment IDs are removed
 * from the appended list).
 */
export function isLastSegmentAppended(
  expectedSegments: readonly { id: string }[],
  appendedSegments: readonly AppendedSegment[] | undefined
): boolean {
  if (expectedSegments.length === 0) return true;
  const lastSeg = expectedSegments[expectedSegments.length - 1];
  if (!lastSeg) return false;
  return appendedSegments?.some((s) => s.id === lastSeg.id && !s.partial) ?? false;
}

/**
 * Check if the last segment has been appended for each selected video and
 * audio track. Text tracks are excluded — their cues don't flow through
 * SourceBuffers.
 *
 * Unresolved tracks (e.g. mid quality switch, when `selectedVideoTrackId`
 * has flipped to a track whose media playlist hasn't been fetched yet) are
 * treated as not ready — fast-paths the quality-switch window where the
 * new track's last segment isn't yet known.
 *
 * `appendedByType` typically comes from each per-type SourceBufferActor's
 * `snapshot.get().context.segments`. An absent or empty entry is treated
 * the same as "no segments appended for this type."
 */
export function hasLastSegmentLoaded(
  state: TrackSelectionState,
  appendedByType: {
    video?: readonly AppendedSegment[] | undefined;
    audio?: readonly AppendedSegment[] | undefined;
  }
): boolean {
  const videoTrack = state.selectedVideoTrackId ? getSelectedTrack(state, 'video') : undefined;
  const audioTrack = state.selectedAudioTrackId ? getSelectedTrack(state, 'audio') : undefined;

  if (videoTrack && !isResolvedTrack(videoTrack)) return false;
  if (audioTrack && !isResolvedTrack(audioTrack)) return false;

  if (videoTrack && isResolvedTrack(videoTrack)) {
    if (!isLastSegmentAppended(videoTrack.segments, appendedByType.video)) return false;
  }

  if (audioTrack && isResolvedTrack(audioTrack)) {
    if (!isLastSegmentAppended(audioTrack.segments, appendedByType.audio)) return false;
  }

  return true;
}
