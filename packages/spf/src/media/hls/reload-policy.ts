import { getMediaPlaylistMetadata, type ResolvedTrack } from '../types';

/** Reload cadence when a playlist carries no usable target duration. */
const FALLBACK_TARGET_DURATION = 6;

/** Identity of a reload snapshot — window position + length. Changes when the window slid or grew. */
function snapshotSignature(track: ResolvedTrack): string {
  return `${getMediaPlaylistMetadata(track)?.mediaSequence ?? 0}:${track.segments.length}`;
}

function targetDurationOf(track: ResolvedTrack | undefined): number {
  return (track && getMediaPlaylistMetadata(track)?.targetDuration) || FALLBACK_TARGET_DURATION;
}

/**
 * Live media-playlist reload cadence, per RFC 8216bis §6.3.4 — a
 * {@link RecurrencePolicy} for a `RecurringRunner` re-resolving the selected
 * track. Structurally matches `RecurrencePolicy<ResolvedTrack>` without
 * importing it (media stays core-free): `current` is the freshly resolved track
 * (`undefined` if the reload errored), `previous` the prior resolved snapshot.
 *
 * - Complete playlist (VoD, or live that hit `#EXT-X-ENDLIST`) → `null`: stop.
 *   Keys off `Track.duration` (finite once complete), the single completeness
 *   source of truth.
 * - Errored reload (`current` undefined) → retry at the last-known target-
 *   duration cadence (fallback when unknown), keeping the loop alive across
 *   transient fetch failures.
 * - Unchanged window (same media sequence + segment count as `previous`) → poll
 *   at half the target duration; a moved/grown window (or the first reload) →
 *   full target duration.
 *
 * Returned delays are milliseconds.
 */
export function mediaPlaylistReloadDelay(
  current: ResolvedTrack | undefined,
  previous: ResolvedTrack | undefined
): number | null {
  if (!current) return targetDurationOf(previous) * 1000;
  if (Number.isFinite(current.duration)) return null;

  const target = targetDurationOf(current);
  const changed = !previous || snapshotSignature(current) !== snapshotSignature(previous);
  return (changed ? target : target / 2) * 1000;
}
