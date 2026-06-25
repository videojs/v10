import type { Segment } from './types';

/** A segment in the buffer paired with where it actually landed (native PTS). */
export interface BufferedAnchor {
  segmentId: string;
  /** The segment's actual start on the buffer (native-PTS) timeline. */
  actualStart: number;
}

/**
 * Correlate the model against the buffer to find a pin anchor: a fully-buffered
 * segment and where it *actually* sits in native PTS.
 *
 * `appendedSegments` are the segments recorded as appended (model coordinates —
 * `meta.startTime`), each flagged `partial` while its streaming append is still
 * in progress; `bufferedRanges` are the real native-PTS ranges
 * (`mediaElement.buffered`, exposed DOM-free by the buffer actor).
 *
 * Pins to the buffer's **trailing edge**: the earliest fully-appended segment
 * sits at the start of the earliest buffered range, so its actual native start is
 * `minBufferedStart`. The trailing edge — not the leading edge — because a
 * streaming append grows the leading edge one chunk at a time (one `appendBuffer`
 * per chunk; see `appendSegment`), so the newest segment's bytes are only partway
 * into `buffered`; pairing it with `maxBufferedEnd − duration` mis-reads its start
 * by up to a full segment, which then shifts the whole derived timeline (observed
 * as a ~2 s offset that turns `seg0` negative on a window anchored at the origin).
 * The trailing edge only moves on eviction, which hasn't happened when the anchor
 * is first established. Partial (still-appending) segments are excluded outright —
 * their bytes are not fully in `buffered`.
 *
 * Pairing the chosen segment's id with that start lets
 * {@link presentationAnchorFromBuffer} derive the shared presentation anchor that
 * positions every track (the constant offset means any in-window segment pins the
 * whole window).
 *
 * Returns `undefined` before any segment is fully buffered.
 */
export function bufferedAnchorFor(
  appendedSegments: readonly (Pick<Segment, 'id' | 'startTime' | 'duration'> & { partial?: boolean })[],
  bufferedRanges: readonly { readonly start: number; readonly end: number }[]
): BufferedAnchor | undefined {
  if (bufferedRanges.length === 0) return undefined;

  // Only fully-appended segments are reliable ground truth; a partial segment's
  // bytes are only partway into `buffered`.
  const settled = appendedSegments.filter((segment) => !segment.partial);
  if (settled.length === 0) return undefined;

  const earliest = settled.reduce((a, b) => (b.startTime < a.startTime ? b : a));
  const minBufferedStart = Math.min(...bufferedRanges.map((r) => r.start));
  return { segmentId: earliest.id, actualStart: minBufferedStart };
}
