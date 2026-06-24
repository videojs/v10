import { describe, expect, it } from 'vitest';
import {
  positionTrackToAnchor,
  presentationAnchorEstimate,
  presentationAnchorFromBuffer,
} from '../presentation-anchor';
import { MEDIA_PLAYLIST_METADATA_KEY, type Track } from '../types';

/** Minimal live track: a window starting at `startTime`, 2s segments, PDT from `startDate`. */
function track(
  opts: {
    startTime?: number;
    startDate?: number | undefined;
    mediaSequence?: number;
    segmentStartDates?: (number | undefined)[];
  } = {}
): Track {
  const startTime = opts.startTime ?? 100;
  const startDate = 'startDate' in opts ? opts.startDate : 1000;
  return {
    type: 'video',
    id: 'v-1',
    startTime,
    startDate,
    segments: [0, 2, 4, 6, 8].map((offset, i) => ({
      id: `segment-${(opts.mediaSequence ?? 50) + i}`,
      url: `${(opts.mediaSequence ?? 50) + i}.m4s`,
      duration: 2,
      startTime: startTime + offset,
      // Each segment's PDT = the track origin (startDate) + the segment's own
      // media-time (startTime + offset), so track.startDate stays the PDT at time 0.
      startDate: opts.segmentStartDates
        ? opts.segmentStartDates[i]
        : startDate === undefined
          ? undefined
          : startDate + startTime + offset,
    })),
    metadata: {
      [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: opts.mediaSequence ?? 50, targetDuration: 2, endList: false },
    },
  } as unknown as Track;
}

describe('presentationAnchorFromBuffer', () => {
  it('is the pinned segment PDT minus where it actually landed (PDT at media-time 0)', () => {
    // segment-50 has PDT 1100 and actually landed at native PTS 480 → anchor 620.
    expect(presentationAnchorFromBuffer(track(), 'segment-50', 480)).toBe(620);
  });

  it('is undefined when the segment is absent or carries no PDT', () => {
    expect(presentationAnchorFromBuffer(track(), 'missing', 480)).toBeUndefined();
    expect(
      presentationAnchorFromBuffer(track({ segmentStartDates: [undefined, 1, 2, 3, 4] }), 'segment-50', 480)
    ).toBeUndefined();
  });
});

describe('presentationAnchorEstimate', () => {
  it('estimates PDT at media-time 0 from sequence × average duration', () => {
    // anchor segment-50 PDT 1100; originOffset = (50 − 0) × 2 = 100 → anchor 1000.
    expect(presentationAnchorEstimate(track())).toBe(1000);
  });

  it('honors presumedStartSequence', () => {
    // originOffset = (50 − 10) × 2 = 80 → 1100 − 80 = 1020.
    expect(presentationAnchorEstimate(track(), { presumedStartSequence: 10 })).toBe(1020);
  });

  it('is undefined when no segment carries PDT', () => {
    expect(presentationAnchorEstimate(track({ startDate: undefined }))).toBeUndefined();
  });
});

describe('positionTrackToAnchor', () => {
  it('shifts the track so startDate coincides with the anchor', () => {
    // track.startDate 1000, anchor 900 → shift +100 (startTime 100 → 200).
    const positioned = positionTrackToAnchor(track(), 900);
    expect(positioned.startDate).toBe(900);
    expect(positioned.startTime).toBe(200);
    expect(positioned.segments.map((s) => s.startTime)).toEqual([200, 202, 204, 206, 208]);
    // Segment PDTs are intrinsic — they don't move.
    expect(positioned.segments.map((s) => s.startDate)).toEqual([1100, 1102, 1104, 1106, 1108]);
  });

  it('is a no-op when already on the anchor or the track has no PDT origin', () => {
    const t = track();
    expect(positionTrackToAnchor(t, 1000)).toBe(t); // startDate already 1000
    const noPdt = track({ startDate: undefined });
    expect(positionTrackToAnchor(noPdt, 900)).toBe(noPdt);
  });
});
