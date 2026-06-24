import type { Segment } from './types';

/** A segment in the buffer paired with where it actually landed (native PTS). */
export interface BufferedAnchor {
  segmentId: string;
  /** The segment's actual start on the buffer (native-PTS) timeline. */
  actualStart: number;
}

/**
 * Correlate the model against the buffer to find a pin anchor: the segment at the
 * buffer's leading edge and where it *actually* sits in native PTS.
 *
 * `appendedSegments` are the segments known to be in the SourceBuffer (model
 * coordinates — `meta.startTime`); `bufferedRanges` are the real native-PTS
 * ranges (`mediaElement.buffered`, exposed DOM-free by the buffer actor). The
 * latest appended segment sits at the buffer's leading edge, so its actual start
 * is `maxBufferedEnd − duration`. Pairing its id with that start lets
 * {@link presentationAnchorFromBuffer} derive the shared presentation anchor
 * that positions every track (the constant offset means one anchor pins the
 * window).
 *
 * Returns `undefined` before anything is buffered — callers fall back to the
 * sequence estimate until then.
 */
export function bufferedAnchorFor(
  appendedSegments: readonly Pick<Segment, 'id' | 'startTime' | 'duration'>[],
  bufferedRanges: readonly { readonly start: number; readonly end: number }[]
): BufferedAnchor | undefined {
  if (appendedSegments.length === 0 || bufferedRanges.length === 0) return undefined;

  const latest = appendedSegments.reduce((a, b) => (b.startTime > a.startTime ? b : a));
  const maxBufferedEnd = Math.max(...bufferedRanges.map((r) => r.end));
  return { segmentId: latest.id, actualStart: maxBufferedEnd - latest.duration };
}
