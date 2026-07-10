import { describe, expect, it } from 'vitest';
import { derivePerTypeStartMediaTime } from '../establish-start-media-time';

describe('derivePerTypeStartMediaTime', () => {
  it('derives the origin as baseMediaDecodeTime/timescale − segmentStartTime (0th segment)', () => {
    // Mux asset_start_time=60: origin ≈ 60s. First loaded segment is the 0th (startTime 0).
    expect(
      derivePerTypeStartMediaTime(
        { video: { timescale: 90000, baseMediaDecodeTime: 90000 * 60, segmentStartTime: 0 } },
        {}
      )
    ).toEqual({ video: 60 });
  });

  it('subtracts a non-zero segmentStartTime so it yields the stream origin, not the loaded segment', () => {
    // Same source, but the first *loaded* segment starts at presentation 100 (native ≈160s) —
    // e.g. a non-zero initial currentTime. The origin must still be 60, not 160.
    expect(
      derivePerTypeStartMediaTime(
        { video: { timescale: 90000, baseMediaDecodeTime: 90000 * 160, segmentStartTime: 100 } },
        {}
      )
    ).toEqual({ video: 60 });
  });

  it('is undefined for a type until timescale + baseMediaDecodeTime + segmentStartTime are all present', () => {
    expect(derivePerTypeStartMediaTime({ video: { timescale: 90000 } }, {})).toEqual({ video: undefined });
    expect(derivePerTypeStartMediaTime({ audio: { baseMediaDecodeTime: 100, segmentStartTime: 0 } }, {})).toEqual({
      audio: undefined,
    });
  });

  it('resolves each track type independently (preserving real A/V skew)', () => {
    expect(
      derivePerTypeStartMediaTime(
        {
          video: { timescale: 90000, baseMediaDecodeTime: 90000 * 60, segmentStartTime: 0 },
          audio: { timescale: 48000, baseMediaDecodeTime: 48000 * 59.956, segmentStartTime: 0 },
        },
        {}
      )
    ).toEqual({ video: 60, audio: 59.956 });
  });
});
