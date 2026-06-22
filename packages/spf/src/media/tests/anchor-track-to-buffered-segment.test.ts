import { describe, expect, it } from 'vitest';
import { anchorTrackToBufferedSegment } from '../anchor-track-to-buffered-segment';
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

describe('anchorTrackToBufferedSegment', () => {
  it('re-origins the whole track so the named segment lands at its actual buffered start', () => {
    // Estimate placed segment-85 at model startTime 340; the SourceBuffer actually
    // holds it at native PTS 370 — a +30 correction the buffer (ground truth) wins.
    const track = makeTrack(85, [
      { startTime: 340, duration: 4, pdt: 1000 },
      { startTime: 344, duration: 4, pdt: 1004 },
    ]);

    const pinned = anchorTrackToBufferedSegment(track, 'segment-85', 370);

    expect(pinned.segments.map((s) => s.startTime)).toEqual([370, 374]);
    expect(pinned.startTime).toBe(370);
    // startDate (wall clock at timeline 0) tracks the shift: PDT(seg) − newStart = 1000 − 370.
    expect(pinned.startDate).toBe(630);
    // Per-segment PDT is intrinsic — unchanged by the re-origin.
    expect(pinned.segments.map((s) => s.startDate)).toEqual([1000, 1004]);
  });

  it('corrects a backward drift too (estimate ahead of the buffer)', () => {
    const track = makeTrack(85, [{ startTime: 340, duration: 4, pdt: 1000 }]);
    const pinned = anchorTrackToBufferedSegment(track, 'segment-85', 320);
    expect(pinned.startTime).toBe(320);
    expect(pinned.segments[0]?.startTime).toBe(320);
  });

  it('is idempotent when the segment already sits at the buffered start (offset 0)', () => {
    const track = makeTrack(85, [{ startTime: 340, duration: 4, pdt: 1000 }]);
    expect(anchorTrackToBufferedSegment(track, 'segment-85', 340)).toBe(track);
  });

  it('no-ops (returns the same track) when the segment is not present', () => {
    const track = makeTrack(85, [{ startTime: 340, duration: 4, pdt: 1000 }]);
    expect(anchorTrackToBufferedSegment(track, 'segment-999', 500)).toBe(track);
  });
});
