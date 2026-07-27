/**
 * Forward Buffer Strategy (Simple)
 *
 * Determines which segments to load for forward buffer management.
 * V1 uses simple fixed-duration strategy (buffer N seconds ahead).
 */

import { SEGMENT_TIME_EPSILON, type Segment } from '../types';

/** A half-open `[start, end)` interval on the presentation timeline. */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Merge intervals into sorted, disjoint ranges; touching or overlapping ranges
 * (gap ≤ `epsilon`) are joined. Empty/inverted ranges are dropped.
 */
export function mergeTimeRanges(ranges: readonly TimeRange[], epsilon = SEGMENT_TIME_EPSILON): TimeRange[] {
  const sorted = ranges.filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end + epsilon) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ start: r.start, end: r.end });
    }
  }
  return merged;
}

/**
 * Whether `[start, end)` is fully covered by the union of `merged` ranges,
 * tolerating `epsilon` of overhang at each edge. `merged` must be disjoint and
 * sorted (as returned by `mergeTimeRanges`), so full coverage means a single
 * merged range contains the interval.
 */
export function isTimeRangeCovered(
  start: number,
  end: number,
  merged: readonly TimeRange[],
  epsilon = SEGMENT_TIME_EPSILON
): boolean {
  return merged.some((r) => r.start <= start + epsilon && r.end >= end - epsilon);
}

/**
 * Forward buffer configuration.
 */
export interface ForwardBufferConfig {
  /**
   * Duration in seconds to buffer ahead of current playback position.
   * Default: 30 seconds.
   */
  bufferDuration: number;
}

/**
 * Default forward buffer configuration.
 */
export const DEFAULT_FORWARD_BUFFER_CONFIG: ForwardBufferConfig = {
  bufferDuration: 30,
};

/**
 * Get segments that need to be loaded for forward buffer.
 *
 * Determines which segments to load to maintain target buffer duration.
 * Handles discontiguous buffering (gaps after seeks).
 *
 * Algorithm:
 * 1. Calculate target time: currentTime + bufferDuration
 * 2. Find all segments in range [currentTime, targetTime)
 * 3. Filter out segments already buffered at that time position
 * 4. Return segments to load (fills gaps + extends to target)
 *
 * @param segments - All available segments from playlist
 * @param bufferedSegments - Segments already buffered (ordered by startTime)
 * @param currentTime - Current playback position in seconds
 * @param config - Optional forward buffer configuration
 * @returns Array of segments to load (empty if buffer is sufficient)
 *
 * @example
 * // After seek: buffered [0-12, 18-30], playing at 7s
 * const toLoad = getSegmentsToLoad(segments, buffered, 7, { bufferDuration: 24 });
 * // Returns [seg-12, seg-30] (fills gap, extends to target 31s)
 */
/**
 * Calculate the start time from which to flush forward buffer content.
 *
 * Content that starts at or beyond `currentTime + bufferDuration` is no
 * longer needed for the current playback position and should be removed
 * from the SourceBuffer. This prevents unbounded accumulation of scattered
 * SourceBuffer content after seeks, which can cause QuotaExceededError on
 * long-form content.
 *
 * Returns `Infinity` when nothing needs flushing (no buffered segments
 * exist beyond the threshold).
 *
 * @param bufferedSegments - Segments currently tracked in the buffer model
 * @param currentTime - Current playback position in seconds
 * @param config - Optional forward buffer configuration
 * @returns Start time to flush from (flush range: [flushStart, Infinity)),
 *          or Infinity if no flush is needed
 *
 * @example
 * // Playing at 0s, buffered [0,6,12,18,24,30,36], bufferDuration=30
 * const flushStart = calculateForwardFlushPoint(segments, 0);
 * // Returns 30 — flush [30, Infinity), keep [0, 30)
 */
export function calculateForwardFlushPoint(
  bufferedSegments: readonly Segment[],
  currentTime: number,
  config: ForwardBufferConfig = DEFAULT_FORWARD_BUFFER_CONFIG
): number {
  if (bufferedSegments.length === 0) return Infinity;

  const threshold = currentTime + config.bufferDuration;

  // Find segments that start at or beyond the threshold
  const beyond = bufferedSegments.filter((seg) => seg.startTime >= threshold);

  if (beyond.length === 0) return Infinity;

  // Flush from the earliest such segment onward
  return Math.min(...beyond.map((seg) => seg.startTime));
}

/**
 * Find the start time of the segment containing `currentTime` (or the last
 * segment if `currentTime` is past the end). Returns `undefined` when
 * `currentTime` is undefined or when no segment matches.
 *
 * Used to detect "meaningful currentTime change" — two times that map to the
 * same segment start aren't a load-trigger; crossing a segment boundary is.
 */
export function segmentStartForTime(
  currentTime: number | undefined,
  segments: readonly Pick<Segment, 'startTime' | 'duration'>[] | undefined
): number | undefined {
  if (currentTime == null) return undefined;
  return segments?.find(
    ({ startTime, duration }, i, all) =>
      currentTime >= startTime && (currentTime < startTime + duration || i === all.length - 1)
  )?.startTime;
}

export function getSegmentsToLoad(
  segments: readonly Segment[],
  bufferedSegments: readonly Pick<Segment, 'startTime' | 'duration'>[],
  currentTime: number,
  config: ForwardBufferConfig = DEFAULT_FORWARD_BUFFER_CONFIG
): Segment[] {
  if (segments.length === 0) {
    return [];
  }

  // Calculate target buffer end time
  const targetTime = currentTime + config.bufferDuration;

  // Create set of buffered segment start times for fast lookup
  // V1 simple: if ANY segment is buffered at a given time, don't load for that time
  // V2 (future): would compare by startTime + bitrate/track for quality switching
  const bufferedStartTimes = new Set(bufferedSegments.map((seg) => seg.startTime));

  // Find segments to load:
  // - Overlaps buffer window [currentTime, targetTime)
  // - Not already buffered at that time position
  const toLoad = segments.filter((seg) => {
    // Segment must overlap the buffer window
    const segmentEnd = seg.startTime + seg.duration;
    const isInRange = seg.startTime < targetTime && segmentEnd > currentTime;

    // Must not have a segment buffered at this time position
    const isNotBuffered = !bufferedStartTimes.has(seg.startTime);

    return isInRange && isNotBuffered;
  });

  return toLoad;
}
