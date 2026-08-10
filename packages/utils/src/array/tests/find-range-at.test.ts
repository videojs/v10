import { describe, expect, it } from 'vite-plus/test';

import { findRangeAt } from '../find-range-at';

const ranges = [
  { start: 0, end: 5 },
  { start: 5, end: 10 },
];

describe('findRangeAt', () => {
  it('finds a containing range', () => {
    expect(findRangeAt(ranges, 0, getStart, getEnd)).toBe(ranges[0]);
    expect(findRangeAt(ranges, 5, getStart, getEnd)).toBe(ranges[1]);
    expect(findRangeAt(ranges, 10, getStart, getEnd)).toBe(ranges[1]);
  });

  it('returns undefined outside the ranges', () => {
    expect(findRangeAt(ranges, -1, getStart, getEnd)).toBeUndefined();
    expect(findRangeAt(ranges, 11, getStart, getEnd)).toBeUndefined();
  });
});

function getStart(range: (typeof ranges)[number]): number {
  return range.start;
}

function getEnd(range: (typeof ranges)[number]): number {
  return range.end;
}
