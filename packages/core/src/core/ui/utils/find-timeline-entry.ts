export interface TimelineEntry {
  startTime: number;
}

/** Finds the last timeline entry whose start time is at or before the given time. */
export function findTimelineEntry<Entry extends TimelineEntry>(
  entries: readonly Entry[],
  time: number
): Entry | undefined {
  let low = 0;
  let high = entries.length - 1;
  let result: Entry | undefined;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const entry = entries[mid]!;

    if (time >= entry.startTime) {
      result = entry;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}
