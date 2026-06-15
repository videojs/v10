import { isUndefined } from '@videojs/utils/predicate';
import { getMediaPlaylistMetadata, type Track } from './types';

export interface AnchorToSequenceOriginOptions {
  /**
   * Sequence number assumed to be the stream's origin (time 0). Defaults to 0
   * — the spec default when `EXT-X-MEDIA-SEQUENCE` is absent, and the common
   * encoder convention. Override when the true origin sequence is known.
   */
  startSequence?: number;
}

/**
 * Re-origin a track's timeline to an estimated stream start (the segment at
 * `startSequence`, default 0), so `startTime` reads as elapsed-since-stream-start
 * and `startDate` becomes the wall clock at that origin — the stream-absolute
 * convention, from the manifest alone.
 *
 * A mid-join live playlist omits the earlier segments, so their total duration
 * is estimated from the observed segments' **average duration** — more reliable
 * than `EXT-X-TARGETDURATION` (a spec ceiling that systematically
 * over-estimates). The origin offset of the first PDT-bearing segment is
 * `(its sequence − startSequence) × averageDuration`; present segments keep
 * their actual relative spacing, only the offset to the unseen origin is
 * estimated.
 *
 * ROUGH and provisional: assumes `startSequence` is the true origin (often but
 * not always correct — configurable), roughly uniform durations, and no
 * discontinuities in the unseen past; error grows with the sequence gap.
 * Refined later from the buffer (`buffered`/`tfdt`), which is authoritative.
 *
 * Per-track: each track estimates independently, so two tracks' results can
 * differ by their accumulated average-duration difference (e.g. AAC audio vs
 * video). Exact cross-track A/V alignment comes from `alignTrackTimelines`
 * (PDT) and ultimately the buffer, not from these estimates.
 *
 * No-op when there are no segments or none carries `programDateTime`.
 */
export function anchorTrackToSequenceOrigin<Tracks extends Track>(
  track: Tracks,
  { startSequence = 0 }: AnchorToSequenceOriginOptions = {}
): Tracks {
  const { segments } = track;
  const anchorIndex = segments.findIndex((segment) => !isUndefined(segment.programDateTime));
  const anchor = segments[anchorIndex];
  if (!anchor || isUndefined(anchor.programDateTime)) {
    return track;
  }

  const mediaSequence = getMediaPlaylistMetadata(track)?.mediaSequence ?? 0;
  const anchorSequence = mediaSequence + anchorIndex;
  const averageDuration = segments.reduce((sum, segment) => sum + segment.duration, 0) / segments.length;
  const originOffset = (anchorSequence - startSequence) * averageDuration;
  const shift = originOffset - anchor.startTime;
  if (shift === 0) {
    return track;
  }

  return {
    ...track,
    startTime: track.startTime + shift,
    startDate: anchor.programDateTime - originOffset,
    segments: segments.map((segment) => ({ ...segment, startTime: segment.startTime + shift })),
  };
}
