/**
 * End-of-stream detection helpers.
 *
 * Pure predicate that compares a track's expected segment list against the
 * appended-segment list from an MSE SourceBufferActor's snapshot. Consumed
 * by the `endOfStream` playback behavior to decide when to call
 * `MediaSource.endOfStream()`.
 *
 * Kept here so the layering stays clean: predicate has no `core/`
 * reactivity and operates on plain segment lists extracted by the caller.
 */

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
