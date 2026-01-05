/**
 * Converts a TimeRanges object to an array of [start, end] tuples.
 *
 * @param ranges - The TimeRanges object to serialize
 * @returns An array of [start, end] tuples
 */
export function serializeTimeRanges(ranges: TimeRanges): Array<[number, number]> {
  const result: Array<[number, number]> = [];

  for (let i = 0; i < ranges.length; i++) {
    result.push([ranges.start(i), ranges.end(i)]);
  }

  return result;
}

/**
 * Determines the stream type based on duration and seekability.
 *
 * @param duration - The media duration
 * @param seekable - The seekable TimeRanges
 * @returns The stream type
 */
export function resolveStreamType(
  duration: number,
  seekable: TimeRanges,
): 'on-demand' | 'live' | 'live-dvr' | 'unknown' {
  // Infinity duration indicates live stream
  if (duration === Infinity) {
    // Check if there's a seekable range (DVR capability)
    if (seekable.length > 0) {
      const seekableEnd = seekable.end(seekable.length - 1);
      const seekableStart = seekable.start(0);
      const seekableRange = seekableEnd - seekableStart;

      // If there's a significant seekable range, it's DVR
      if (seekableRange > 0) {
        return 'live-dvr';
      }
    }

    return 'live';
  }

  // Unknown if no valid duration (NaN, 0, negative)
  if (!Number.isFinite(duration) || duration <= 0) {
    return 'unknown';
  }

  return 'on-demand';
}
