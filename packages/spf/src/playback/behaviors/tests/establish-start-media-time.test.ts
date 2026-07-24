import { describe, expect, it } from 'vitest';
import {
  derivePerTypeStartMediaTime,
  deriveSharedMinStartMediaTime,
  NEAR_ZERO_ORIGIN_THRESHOLD,
} from '../establish-start-media-time';

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

  it('leaves ordinary ~0-PTS VOD native: a shared origin below the threshold returns 0', () => {
    // Both types carry a sub-second (0.5s) encode offset → not relocated.
    expect(
      deriveSharedMinStartMediaTime(
        {
          video: { timescale: 90000, baseMediaDecodeTime: 45000, segmentStartTime: 0 },
          audio: { timescale: 48000, baseMediaDecodeTime: 24000, segmentStartTime: 0 },
        },
        sel
      )
    ).toEqual({ video: 0, audio: 0 });
  });

  it('relocates at/above the threshold (the boundary is exclusive)', () => {
    const atThreshold = {
      video: { timescale: 90000, baseMediaDecodeTime: 90000 * NEAR_ZERO_ORIGIN_THRESHOLD, segmentStartTime: 0 },
      audio: { timescale: 48000, baseMediaDecodeTime: 48000 * NEAR_ZERO_ORIGIN_THRESHOLD, segmentStartTime: 0 },
    };
    expect(deriveSharedMinStartMediaTime(atThreshold, sel)).toEqual({
      video: NEAR_ZERO_ORIGIN_THRESHOLD,
      audio: NEAR_ZERO_ORIGIN_THRESHOLD,
    });
  });

  it('snaps a negative shared origin to 0 (never relocates forward)', () => {
    // segmentStartTime > bmdt/ts → negative own origin.
    expect(
      deriveSharedMinStartMediaTime(
        {
          video: { timescale: 90000, baseMediaDecodeTime: 0, segmentStartTime: 5 },
          audio: { timescale: 48000, baseMediaDecodeTime: 0, segmentStartTime: 5 },
        },
        sel
      )
    ).toEqual({ video: 0, audio: 0 });
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

  it('snaps a below-threshold origin to 0 independently per type', () => {
    expect(
      derivePerTypeStartMediaTime(
        {
          video: { timescale: 90000, baseMediaDecodeTime: 45000, segmentStartTime: 0 }, // 0.5s → 0
          audio: { timescale: 48000, baseMediaDecodeTime: 48000 * 60, segmentStartTime: 0 }, // 60s → 60
        },
        {}
      )
    ).toEqual({ video: 0, audio: 60 });
  });
});
