/**
 * Forward Buffer Strategy (Simple)
 *
 * Determines which segments to load for forward buffer management.
 * V1 uses simple fixed-duration strategy (buffer N seconds ahead).
 */

import type { Segment } from '../types';

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
export function getSegmentsToLoad(
  segments: readonly Segment[],
  bufferedSegments: readonly Segment[],
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
