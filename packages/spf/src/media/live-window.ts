/**
 * Derive the live window of the selected video track — the single source of
 * truth for "where is live," consumed by the seek-to-live-edge and
 * live-seekable-range behaviors so neither re-derives (or re-presumes) the
 * window shape.
 *
 * Returns `null` when there is no live edge to track: an unresolved
 * presentation or track, a track with no segments, or a **complete** playlist
 * (VoD, or live that has ended — a finite `Track.duration`). Video and audio
 * share the timeline origin, so the video track's window positions both.
 */
import {
  getMediaPlaylistMetadata,
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
} from './types';
import { findTrack } from './utils/tracks';

export interface LiveWindow {
  /** Earliest time still in the window (seconds, model timeline). */
  start: number;
  /** The live edge — latest time in the window (seconds). */
  end: number;
  /** Playlist target duration (seconds); falls back to the last segment's duration. */
  targetDuration: number;
}

export function liveWindowFor(
  presentation: MaybeResolvedPresentation | undefined,
  videoTrackId: string | undefined
): LiveWindow | null {
  if (!isResolvedPresentation(presentation) || !videoTrackId) return null;

  const track = findTrack(presentation, 'video', videoTrackId);
  if (!track || !isResolvedTrack(track) || track.segments.length === 0) return null;

  // Complete playlist (VoD, or live that has ended) → no live edge. `Track.duration`
  // is the parser's completeness signal (finite = complete, Infinity = still growing).
  if (Number.isFinite(track.duration)) return null;

  const { segments } = track;
  const last = segments[segments.length - 1]!;
  return {
    start: segments[0]!.startTime,
    end: last.startTime + last.duration,
    targetDuration: getMediaPlaylistMetadata(track)?.targetDuration || last.duration,
  };
}
