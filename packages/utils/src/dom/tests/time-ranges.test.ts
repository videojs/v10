import { describe, expect, it } from 'vitest';

import { serializeTimeRanges } from '../time-ranges';

describe('serializeTimeRanges', () => {
  it('returns empty array for empty TimeRanges', () => {
    const ranges = createTimeRanges([]);
    expect(serializeTimeRanges(ranges)).toEqual([]);
  });

  it('serializes single range', () => {
    const ranges = createTimeRanges([[0, 10]]);
    expect(serializeTimeRanges(ranges)).toEqual([[0, 10]]);
  });

  it('serializes multiple ranges', () => {
    const ranges = createTimeRanges([
      [0, 5],
      [10, 20],
      [30, 45],
    ]);
    expect(serializeTimeRanges(ranges)).toEqual([
      [0, 5],
      [10, 20],
      [30, 45],
    ]);
  });
});

/**
 * Helper to create a mock TimeRanges object.
 */
function createTimeRanges(ranges: Array<[number, number]>): TimeRanges {
  return {
    length: ranges.length,
    start(index: number): number {
      const range = ranges[index];
      if (index < 0 || index >= ranges.length || !range) {
        throw new DOMException('Index out of range', 'IndexSizeError');
      }
      return range[0];
    },
    end(index: number): number {
      const range = ranges[index];
      if (index < 0 || index >= ranges.length || !range) {
        throw new DOMException('Index out of range', 'IndexSizeError');
      }
      return range[1];
    },
  };
}
