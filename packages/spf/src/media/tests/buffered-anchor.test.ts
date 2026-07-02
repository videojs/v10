import { describe, expect, it } from 'vitest';
import { bufferedAnchorFor } from '../buffered-anchor';

describe('bufferedAnchorFor', () => {
  it('pairs the trailing-edge (earliest) segment with its actual native-PTS start', () => {
    // Model says the earliest segment sits at 100; the buffer's real trailing edge
    // is 530 → it actually starts at 530 (a +430 native-PTS offset). The same
    // presentation anchor results whichever in-window segment is used, so pinning
    // to the stable trailing edge is equivalent when the buffer is consistent.
    const anchor = bufferedAnchorFor(
      [
        { id: 's1', startTime: 100, duration: 10 },
        { id: 's2', startTime: 110, duration: 10 },
      ],
      [{ start: 530, end: 550 }]
    );
    expect(anchor).toEqual({ segmentId: 's1', actualStart: 530 });
  });

  it('excludes a partial (still-appending) segment so an in-flight leading edge cannot skew the pin', () => {
    // s1 is mid-stream-append: its bytes are only partway into `buffered` (the
    // range reaches 3, i.e. s0 fully + 1s of s1). Pinning to the leading edge here
    // would mis-read s1's start as 3 − 2 = 1 (off by ~a segment); the trailing-edge
    // pin reads s0 at the stable buffer start (0).
    const anchor = bufferedAnchorFor(
      [
        { id: 's0', startTime: 0, duration: 2 },
        { id: 's1', startTime: 2, duration: 2, partial: true },
      ],
      [{ start: 0, end: 3 }]
    );
    expect(anchor).toEqual({ segmentId: 's0', actualStart: 0 });
  });

  it('uses the earliest range start across discontiguous ranges', () => {
    const anchor = bufferedAnchorFor(
      [{ id: 's0', startTime: 0, duration: 10 }],
      [
        { start: 5, end: 15 },
        { start: 20, end: 30 },
      ]
    );
    expect(anchor?.actualStart).toBe(5);
  });

  it('returns undefined before any segment is fully buffered', () => {
    // No buffered ranges yet.
    expect(bufferedAnchorFor([{ id: 's1', startTime: 0, duration: 10 }], [])).toBeUndefined();
    // No appended segments.
    expect(bufferedAnchorFor([], [{ start: 0, end: 10 }])).toBeUndefined();
    // Only a partial segment — not yet reliable ground truth.
    expect(
      bufferedAnchorFor([{ id: 's0', startTime: 0, duration: 2, partial: true }], [{ start: 0, end: 1 }])
    ).toBeUndefined();
  });
});
