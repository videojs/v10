import { describe, expect, it } from 'vitest';
import {
  findMediaTrack,
  readBaseMediaDecodeTime,
  readFirstBaseMediaDecodeTime,
  readFirstMediaTimescale,
} from '../timestamp-origin';
import { box, initSegment, mediaSegment, trak } from './synthetic-boxes';

// Mirrors the Apple bipbop advanced example: a video init/segment that muxes a
// closed-caption (`clcp`) track alongside the `vide` track, each with its own
// timescale and baseMediaDecodeTime.
const muxedVideoInit = initSegment(
  trak({ handler: 'vide', trackId: 1, timescale: 6000 }),
  trak({ handler: 'clcp', trackId: 2, timescale: 30000 })
);
const muxedVideoSegment = mediaSegment(
  { trackId: 1, baseMediaDecodeTime: 60000 }, // video → 60000/6000 = 10.0s
  { trackId: 2, baseMediaDecodeTime: 300000 } // captions → 300000/30000 = 10.0s
);

describe('readFirstMediaTimescale', () => {
  it('reads the first mdhd timescale (single-track init)', () => {
    const audioInit = initSegment(trak({ handler: 'soun', trackId: 1, timescale: 48000 }));
    expect(readFirstMediaTimescale(audioInit)).toBe(48000);
  });

  it('reads the first trak on a muxed init — correct only by ordering', () => {
    // Video happens to be first here; a clcp-first muxing would mis-read. That
    // ordering fragility is exactly why the muxed case needs findMediaTrack.
    expect(readFirstMediaTimescale(muxedVideoInit)).toBe(6000);
  });

  it('reads a v1 mdhd timescale (wider date fields)', () => {
    const init = initSegment(trak({ handler: 'vide', trackId: 1, timescale: 90000, mdhdVersion: 1 }));
    expect(readFirstMediaTimescale(init)).toBe(90000);
  });

  it('returns undefined when no mdhd exists', () => {
    expect(readFirstMediaTimescale(box('moov', box('mvhd')))).toBeUndefined();
  });
});

describe('findMediaTrack', () => {
  it('selects the media track by handler, ignoring a muxed caption track', () => {
    expect(findMediaTrack(muxedVideoInit, 'vide')).toEqual({ trackId: 1, timescale: 6000 });
  });

  it('selects an audio track by handler', () => {
    const audioInit = initSegment(trak({ handler: 'soun', trackId: 1, timescale: 48000 }));
    expect(findMediaTrack(audioInit, 'soun')).toEqual({ trackId: 1, timescale: 48000 });
  });

  it('handles v1 tkhd/mdhd (wider date fields)', () => {
    const init = initSegment(trak({ handler: 'vide', trackId: 7, timescale: 90000, mdhdVersion: 1, tkhdVersion: 1 }));
    expect(findMediaTrack(init, 'vide')).toEqual({ trackId: 7, timescale: 90000 });
  });

  it('returns undefined when no track matches the handler', () => {
    expect(findMediaTrack(muxedVideoInit, 'soun')).toBeUndefined();
  });
});

describe('readFirstBaseMediaDecodeTime', () => {
  it('reads the first traf', () => {
    expect(readFirstBaseMediaDecodeTime(muxedVideoSegment)).toBe(60000);
  });

  it('reads a 64-bit v1 baseMediaDecodeTime beyond the 32-bit range', () => {
    const large = 2 ** 33 + 12345;
    expect(readFirstBaseMediaDecodeTime(mediaSegment({ trackId: 1, baseMediaDecodeTime: large, version: 1 }))).toBe(
      large
    );
  });

  it('returns undefined when the traf or tfdt is absent', () => {
    expect(readFirstBaseMediaDecodeTime(box('moof', box('traf')))).toBeUndefined();
  });
});

describe('readBaseMediaDecodeTime', () => {
  it('selects the traf matching track_id in a muxed segment', () => {
    expect(readBaseMediaDecodeTime(muxedVideoSegment, 1)).toBe(60000);
    expect(readBaseMediaDecodeTime(muxedVideoSegment, 2)).toBe(300000);
  });

  it('returns undefined when no traf matches track_id', () => {
    expect(readBaseMediaDecodeTime(muxedVideoSegment, 99)).toBeUndefined();
  });
});

describe('track-tied origin (cross-track mismatch guard)', () => {
  it('pairs timescale and baseMediaDecodeTime from the same track', () => {
    const track = findMediaTrack(muxedVideoInit, 'vide')!;
    const bmdt = readBaseMediaDecodeTime(muxedVideoSegment, track.trackId)!;
    // Correct, track-tied origin.
    expect(bmdt / track.timescale).toBe(10);
    // The bug track_id matching prevents: video timescale paired with the
    // caption track's baseMediaDecodeTime would read 50s, not 10s.
    const captionBmdt = readBaseMediaDecodeTime(muxedVideoSegment, 2)!;
    expect(captionBmdt / track.timescale).toBe(50);
  });
});
