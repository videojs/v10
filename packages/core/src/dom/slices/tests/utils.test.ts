import { describe, expect, it } from 'vitest';

import { resolveStreamType, serializeTimeRanges } from '../utils';

describe('utils', () => {
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

  describe('resolveStreamType', () => {
    it('returns unknown for zero duration', () => {
      const seekable = createTimeRanges([]);
      expect(resolveStreamType(0, seekable)).toBe('unknown');
    });

    it('returns unknown for NaN duration', () => {
      const seekable = createTimeRanges([]);
      expect(resolveStreamType(Number.NaN, seekable)).toBe('unknown');
    });

    it('returns on-demand for finite duration', () => {
      const seekable = createTimeRanges([[0, 100]]);
      expect(resolveStreamType(100, seekable)).toBe('on-demand');
    });

    it('returns live for Infinity duration with no seekable range', () => {
      const seekable = createTimeRanges([]);
      expect(resolveStreamType(Infinity, seekable)).toBe('live');
    });

    it('returns live-dvr for Infinity duration with seekable range', () => {
      const seekable = createTimeRanges([[0, 300]]);
      expect(resolveStreamType(Infinity, seekable)).toBe('live-dvr');
    });

    it('returns live for Infinity duration with zero-length seekable range', () => {
      // Edge case: seekable range with same start and end
      const seekable = createTimeRanges([[100, 100]]);
      expect(resolveStreamType(Infinity, seekable)).toBe('live');
    });
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
