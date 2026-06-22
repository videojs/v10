import { describe, expect, it } from 'vitest';
import { bufferedAnchorFor } from '../buffered-anchor';

describe('bufferedAnchorFor', () => {
  it('pairs the leading-edge segment with its actual native-PTS start', () => {
    // Model says the latest segment sits at 110 (+10s long); the buffer's real
    // leading edge is 550 → it actually starts at 540 (a +430 native-PTS offset).
    const anchor = bufferedAnchorFor(
      [
        { id: 's1', startTime: 100, duration: 10 },
        { id: 's2', startTime: 110, duration: 10 },
      ],
      [{ start: 530, end: 550 }]
    );
    expect(anchor).toEqual({ segmentId: 's2', actualStart: 540 });
  });

  it('uses the max end across discontiguous ranges', () => {
    const anchor = bufferedAnchorFor(
      [{ id: 's2', startTime: 110, duration: 10 }],
      [
        { start: 530, end: 545 },
        { start: 548, end: 552 },
      ]
    );
    expect(anchor?.actualStart).toBe(542); // 552 − 10
  });

  it('returns undefined before anything is buffered', () => {
    expect(bufferedAnchorFor([{ id: 's1', startTime: 0, duration: 10 }], [])).toBeUndefined();
    expect(bufferedAnchorFor([], [{ start: 0, end: 10 }])).toBeUndefined();
  });
});
