import { getMediaPlaylistMetadata, type ResolvedTrack } from '../types';

/** Reload cadence when a playlist carries no usable target duration. */
const FALLBACK_TARGET_DURATION = 6;

/**
 * Default `HOLD-BACK` as a multiple of the target duration when the playlist
 * declares none — the HLS spec default (RFC 8216bis `EXT-X-SERVER-CONTROL`).
 */
const HOLD_BACK_TARGET_MULTIPLIER = 3;

/** Identity of a reload snapshot — window position + length. Changes when the window slid or grew. */
function snapshotSignature(track: ResolvedTrack): string {
  return `${getMediaPlaylistMetadata(track)?.mediaSequence ?? 0}:${track.segments.length}`;
}

function targetDurationOf(track: ResolvedTrack): number {
  return getMediaPlaylistMetadata(track)?.targetDuration || FALLBACK_TARGET_DURATION;
}

/**
 * Live media-playlist reload cadence, per RFC 8216bis §6.3.4 — a
 * {@link RecurrencePolicy} for a `RecurringRunner` re-resolving the selected
 * track. Structurally matches `RecurrencePolicy<ResolvedTrack>` without
 * importing it (media stays core-free): `current` is the freshly resolved track,
 * `previous` the prior resolved snapshot.
 *
 * - Complete playlist (VoD, or live that hit `#EXT-X-ENDLIST`) → `null`: stop.
 *   Keys off `Track.duration` (finite once complete), the single completeness
 *   source of truth.
 * - Unchanged window (same media sequence + segment count as `previous`) → poll
 *   at half the target duration; a moved/grown window (or the first reload) →
 *   full target duration.
 *
 * A failed reload doesn't reach here — the rejection propagates through the
 * `RecurringRunner`; transient-failure recovery belongs at the fetch layer.
 *
 * Returned delays are milliseconds.
 */
export function mediaPlaylistReloadDelay(current: ResolvedTrack, previous: ResolvedTrack | undefined): number | null {
  if (Number.isFinite(current.duration)) return null;

  const target = targetDurationOf(current);
  const changed = !previous || snapshotSignature(current) !== snapshotSignature(previous);
  return (changed ? target : target / 2) * 1000;
}

/**
 * Target live latency (seconds) for a resolved track — how far behind the live
 * edge the playhead should sit. HLS derives it from `EXT-X-SERVER-CONTROL`
 * `HOLD-BACK`, defaulting to {@link HOLD_BACK_TARGET_MULTIPLIER}× the target
 * duration. This is the HLS side of the format-neutral `resolveLiveLatency`
 * seam consumed by `seek-to-live-edge`; a DASH engine supplies its own
 * (`suggestedPresentationDelay`).
 */
export function liveLatencyFor(track: ResolvedTrack): number {
  return HOLD_BACK_TARGET_MULTIPLIER * targetDurationOf(track);
}
