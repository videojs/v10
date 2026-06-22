import type { Track } from './types';

/**
 * Re-origin a track's timeline onto the buffer's (native-PTS) timeline, using a
 * segment whose *actual* buffered position is known as ground truth.
 *
 * `anchorTrackToSequenceOrigin` positions the timeline from the manifest alone
 * (an `averageDuration × sequence` estimate); this is the authoritative
 * correction that supersedes it once real data exists. Given a segment present
 * in the track (`segmentId`) and where it actually landed in the SourceBuffer
 * (`actualStart`, from `mediaElement.buffered`), the offset is
 * `actualStart − segment.startTime` (expected) and the whole track shifts by it —
 * so the model's coordinates coincide with the buffer's. Per the
 * no-mid-stream-discontinuity assumption the offset is constant, so pinning from
 * one known segment re-origins the entire window.
 *
 * Segment `startDate` (PDT) is intrinsic wall clock and stays put; only timeline
 * positions move. `Track.startDate` (the wall clock at timeline 0) shifts with
 * the origin.
 *
 * No-op (returns the same track) when the segment isn't present or the offset is
 * zero (already aligned) — so callers can apply it unconditionally each reload.
 */
export function anchorTrackToBufferedSegment<Tracks extends Track>(
  track: Tracks,
  segmentId: string,
  actualStart: number
): Tracks {
  const segment = track.segments.find((s) => s.id === segmentId);
  if (!segment) return track;

  const shift = actualStart - segment.startTime;
  if (shift === 0) return track;

  // `Track.startDate` is the wall clock at timeline 0; shifting positions by
  // `+shift` moves timeline 0 to an earlier instant, so it adjusts by `−shift`.
  // Equivalently, from the pinned segment's intrinsic PDT: `startDate −
  // actualStart` (both forms agree along a linear timeline).
  const startDate =
    track.startDate !== undefined
      ? track.startDate - shift
      : segment.startDate !== undefined
        ? segment.startDate - actualStart
        : undefined;

  return {
    ...track,
    startTime: track.startTime + shift,
    ...(startDate === undefined ? {} : { startDate }),
    segments: track.segments.map((s) => ({ ...s, startTime: s.startTime + shift })),
  };
}
