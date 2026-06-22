import { describe, expect, it } from 'vitest';
import { anchorTrackToSequenceOrigin } from '../anchor-track-to-sequence-origin';
import { MEDIA_PLAYLIST_METADATA_KEY, type Segment, type Track } from '../types';

function makeTrack(
  mediaSequence: number,
  segments: Array<{ startTime: number; duration: number; pdt?: number }>
): Track {
  return {
    type: 'video',
    id: 'track',
    url: 'https://example.com/playlist.m3u8',
    mimeType: 'video/mp4',
    bandwidth: 0,
    duration: Number.POSITIVE_INFINITY,
    startTime: segments[0]?.startTime ?? 0,
    segments: segments.map(
      (s, i): Segment => ({
        id: `segment-${mediaSequence + i}`,
        url: `${mediaSequence + i}.m4s`,
        duration: s.duration,
        startTime: s.startTime,
        ...(s.pdt === undefined ? {} : { startDate: s.pdt }),
      })
    ),
    metadata: {
      [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence, targetDuration: 5, endList: false },
    },
  };
}

describe('anchorTrackToSequenceOrigin', () => {
  it('re-bases startTime to elapsed-since-origin and startDate to the seq-0 wall clock', () => {
    // Mid-join window starting at sequence 85, 4s segments, join-relative startTimes.
    const track = makeTrack(85, [
      { startTime: 0, duration: 4, pdt: 1000 },
      { startTime: 4, duration: 4, pdt: 1004 },
    ]);

    const anchored = anchorTrackToSequenceOrigin(track);

    // origin offset = (85 − 0) × 4 = 340; first segment moves from 0 → 340.
    expect(anchored.segments.map((s) => s.startTime)).toEqual([340, 344]);
    expect(anchored.startTime).toBe(340);
    // startDate = PDT(first) − originOffset = 1000 − 340 = 660 (wall clock at seq 0).
    expect(anchored.startDate).toBe(660);
  });

  it('uses observed average duration, not EXT-X-TARGETDURATION', () => {
    // avg of [3,5,4] = 4; targetDuration is 5 — the estimate must use 4.
    const track = makeTrack(10, [
      { startTime: 0, duration: 3, pdt: 1000 },
      { startTime: 3, duration: 5, pdt: 1003 },
      { startTime: 8, duration: 4, pdt: 1008 },
    ]);

    const anchored = anchorTrackToSequenceOrigin(track);

    // originOffset = (10 − 0) × 4 = 40 (not 10 × 5 = 50).
    expect(anchored.segments[0]?.startTime).toBe(40);
  });

  it('honors a configured presumedStartSequence (no shift when it equals the window start)', () => {
    const track = makeTrack(85, [{ startTime: 0, duration: 4, pdt: 1000 }]);
    // presumedStartSequence = 85 → originOffset 0 → already at origin → unchanged identity.
    expect(anchorTrackToSequenceOrigin(track, { presumedStartSequence: 85 })).toBe(track);
  });

  it('preserves present segments’ actual spacing (only the origin offset is estimated)', () => {
    const track = makeTrack(10, [
      { startTime: 0, duration: 1.9, pdt: 1000 },
      { startTime: 1.9, duration: 2.1, pdt: 1001.9 },
    ]);
    const anchored = anchorTrackToSequenceOrigin(track);
    // Inter-segment gap stays the real 1.9s; both shift by the same offset.
    const [a, b] = anchored.segments;
    expect((b?.startTime ?? 0) - (a?.startTime ?? 0)).toBeCloseTo(1.9, 6);
  });

  it('is a no-op when no segment carries startDate', () => {
    const track = makeTrack(85, [
      { startTime: 0, duration: 4 },
      { startTime: 4, duration: 4 },
    ]);
    expect(anchorTrackToSequenceOrigin(track)).toBe(track);
  });

  it('is a no-op for an empty track', () => {
    const track = makeTrack(0, []);
    expect(anchorTrackToSequenceOrigin(track)).toBe(track);
  });
});
