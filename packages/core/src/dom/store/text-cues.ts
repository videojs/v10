import type { MediaTextCue, TextCueListLike } from '@videojs/media';

/**
 * Plain cue data from a text track's cue list, every end clamped to the media duration once that is finite.
 *
 * Cues delivered with a stream can be open-ended — a chapters document leaves its last chapter open, and the track
 * carries that as a very large `endTime` because engines reject `Infinity` — so a consumer reading the list gets each
 * cue ending no later than the media does. While the duration is unknown or infinite the ends pass through unchanged.
 * Pure: the result is fresh data, never the live cues, so a store can expose it without leaking DOM objects.
 */
export function clampCuesToDuration(cues: TextCueListLike | null | undefined, duration: number): MediaTextCue[] {
  if (!cues) return [];

  const max = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;

  return Array.from(cues, (cue) => ({
    startTime: cue.startTime,
    endTime: Math.min(cue.endTime, max),
    text: cue.text ?? '',
  }));
}
