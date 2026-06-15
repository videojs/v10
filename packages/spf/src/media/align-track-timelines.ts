import { isUndefined } from '@videojs/utils/predicate';
import type { Track } from './types';

/**
 * Align multiple tracks onto a common wall-clock timeline so the same real
 * instant has the same `startTime` across tracks — the cross-track A/V sync
 * step for demuxed audio/video.
 *
 * Each track is parsed independently with its own origin, so a given wall-clock
 * moment lands at different per-track `startTime`s (demuxed audio commonly
 * starts a segment later than video). Every track carries `startDate` — the
 * wall clock at its origin — so the skew between tracks is exactly the
 * difference in their `startDate`s. This shifts each track's `startTime`s (and
 * its origin `startTime`/`startDate`) by that difference, re-basing all tracks
 * to the earliest origin. After alignment, segments with equal
 * `programDateTime` have equal `startTime`.
 *
 * Tracks without a `startDate` (no `programDateTime` in the source) can't be
 * aligned and pass through unchanged. The common origin is the earliest
 * `startDate`, so no `startTime` goes negative.
 */
export function alignTrackTimelines<Tracks extends Track>(tracks: Tracks[]): Tracks[] {
  const origins = tracks.map((track) => track.startDate).filter((date): date is number => !isUndefined(date));
  if (origins.length < 2) {
    return tracks;
  }

  const commonStartDate = Math.min(...origins);
  return tracks.map((track) => {
    if (isUndefined(track.startDate)) {
      return track;
    }
    const shift = track.startDate - commonStartDate;
    if (shift === 0) {
      return track;
    }
    return {
      ...track,
      startTime: track.startTime + shift,
      startDate: commonStartDate,
      segments: track.segments.map((segment) => ({ ...segment, startTime: segment.startTime + shift })),
    };
  });
}
