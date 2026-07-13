import { describe, expect, it } from 'vitest';
import { derivePerTypeStartMediaTime, deriveSharedMinStartMediaTime } from '../establish-start-media-time';

describe('deriveSharedMinStartMediaTime', () => {
  const sel = { selectedVideoTrackId: 'v', selectedAudioTrackId: 'a' };

  it('relocates every type by the shared min across selected A/V origins', () => {
    // Apple bipbop: video origin 10.000 (ts 6000, tfdt 60000), audio origin 9.956
    // (ts 48000, tfdt 477888). Audio leads by 44ms → shared min = 9.956 for BOTH,
    // so relocating preserves the skew (video lands at +0.044, audio at 0).
    expect(
      deriveSharedMinStartMediaTime(
        {
          video: { timescale: 6000, baseMediaDecodeTime: 60000, segmentStartTime: 0 },
          audio: { timescale: 48000, baseMediaDecodeTime: 477888, segmentStartTime: 0 },
        },
        sel
      )
    ).toEqual({ video: 9.956, audio: 9.956 });
  });

  it('matches per-type when A/V is aligned (min equals each equal origin)', () => {
    expect(
      deriveSharedMinStartMediaTime(
        {
          video: { timescale: 90000, baseMediaDecodeTime: 90000 * 60, segmentStartTime: 0 },
          audio: { timescale: 48000, baseMediaDecodeTime: 48000 * 60, segmentStartTime: 0 },
        },
        sel
      )
    ).toEqual({ video: 60, audio: 60 });
  });

  it('barriers: returns nothing until every selected type has a complete origin', () => {
    // Audio is selected but not yet discovered → hold back both (no partial relocation).
    expect(
      deriveSharedMinStartMediaTime(
        { video: { timescale: 6000, baseMediaDecodeTime: 60000, segmentStartTime: 0 } },
        sel
      )
    ).toEqual({});
  });

  it('subtracts a non-zero segmentStartTime so the origin is the stream origin, not the loaded segment', () => {
    expect(
      deriveSharedMinStartMediaTime(
        {
          video: { timescale: 90000, baseMediaDecodeTime: 90000 * 160, segmentStartTime: 100 },
          audio: { timescale: 48000, baseMediaDecodeTime: 48000 * 160, segmentStartTime: 100 },
        },
        sel
      )
    ).toEqual({ video: 60, audio: 60 });
  });

  it('degenerates to the single type when only one is selected', () => {
    expect(
      deriveSharedMinStartMediaTime(
        { video: { timescale: 6000, baseMediaDecodeTime: 60000, segmentStartTime: 0 } },
        { selectedVideoTrackId: 'v' }
      )
    ).toEqual({ video: 10 });
  });

  it('coordinates across whatever types have data when there is no selection context', () => {
    expect(
      deriveSharedMinStartMediaTime(
        {
          video: { timescale: 6000, baseMediaDecodeTime: 60000, segmentStartTime: 0 },
          audio: { timescale: 48000, baseMediaDecodeTime: 477888, segmentStartTime: 0 },
        },
        {}
      )
    ).toEqual({ video: 9.956, audio: 9.956 });
  });
});

describe('derivePerTypeStartMediaTime', () => {
  it('resolves each track type by its own origin (bmdt/ts − segmentStartTime)', () => {
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

  it('subtracts a non-zero segmentStartTime so it yields the stream origin, not the loaded segment', () => {
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
});
