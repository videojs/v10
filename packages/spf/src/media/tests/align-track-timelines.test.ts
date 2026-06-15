import { describe, expect, it } from 'vitest';
import { alignTrackTimelines } from '../align-track-timelines';
import { parseMediaPlaylist } from '../hls/parse-media-playlist';
import liveCmafAudio from '../hls/tests/fixtures/live-cmaf-audio.m3u8?raw';
import liveCmafVideo from '../hls/tests/fixtures/live-cmaf-video.m3u8?raw';
import type { PartiallyResolvedAudioTrack, PartiallyResolvedVideoTrack, Segment, Track } from '../types';

function makeTrack(startDate: number | undefined, segments: Array<{ startTime: number; pdt?: number }>): Track {
  return {
    type: 'video',
    id: 'track',
    url: 'https://example.com/playlist.m3u8',
    mimeType: 'video/mp4',
    bandwidth: 0,
    duration: Number.POSITIVE_INFINITY,
    startTime: segments[0]?.startTime ?? 0,
    startDate,
    segments: segments.map(
      (s, i): Segment => ({
        id: `segment-${i}`,
        url: `s${i}.m4s`,
        duration: 2,
        startTime: s.startTime,
        ...(s.pdt === undefined ? {} : { programDateTime: s.pdt }),
      })
    ),
  };
}

describe('alignTrackTimelines', () => {
  it('re-bases tracks to the earliest origin so equal PDT yields equal startTime', () => {
    // video origin at wall clock 1000; audio origin 2s later (starts a segment behind).
    const video = makeTrack(1000, [
      { startTime: 0, pdt: 1000 },
      { startTime: 2, pdt: 1002 },
      { startTime: 4, pdt: 1004 },
    ]);
    const audio = makeTrack(1002, [
      { startTime: 0, pdt: 1002 },
      { startTime: 2, pdt: 1004 },
    ]);

    const [alignedVideo, alignedAudio] = alignTrackTimelines([video, audio]);

    // Common origin = earliest startDate (video's, 1000).
    expect(alignedVideo?.startDate).toBe(1000);
    expect(alignedAudio?.startDate).toBe(1000);
    // Video unchanged (it is the earliest); audio shifted forward 2s.
    expect(alignedVideo?.segments.map((s) => s.startTime)).toEqual([0, 2, 4]);
    expect(alignedAudio?.segments.map((s) => s.startTime)).toEqual([2, 4]);

    // The same instant (PDT 1004) now has the same startTime in both tracks.
    const vAt1004 = alignedVideo?.segments.find((s) => s.programDateTime === 1004);
    const aAt1004 = alignedAudio?.segments.find((s) => s.programDateTime === 1004);
    expect(vAt1004?.startTime).toBe(aAt1004?.startTime);
  });

  it('passes through when fewer than two tracks carry a startDate', () => {
    const dated = makeTrack(1000, [{ startTime: 0, pdt: 1000 }]);
    const undated = makeTrack(undefined, [{ startTime: 0 }]);

    expect(alignTrackTimelines([dated])).toEqual([dated]);
    // Only one track has a date → nothing to align against.
    const result = alignTrackTimelines([dated, undated]);
    expect(result[0]).toBe(dated);
    expect(result[1]).toBe(undated);
  });

  it('leaves already-aligned tracks untouched (no shift)', () => {
    const a = makeTrack(1000, [{ startTime: 0, pdt: 1000 }]);
    const b = makeTrack(1000, [{ startTime: 0, pdt: 1000 }]);
    const [ra, rb] = alignTrackTimelines([a, b]);
    expect(ra).toBe(a); // identity preserved when shift === 0
    expect(rb).toBe(b);
  });

  it('aligns the real demuxed Mux CMAF audio/video (resolves the 2s skew)', () => {
    const videoShell: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'video-0',
      url: 'https://example.com/video/playlist.m3u8',
      bandwidth: 2191200,
      width: 1280,
      height: 572,
      codecs: ['avc1.640020'],
      frameRate: { frameRateNumerator: 30 },
      mimeType: 'video/mp4',
    };
    const audioShell: PartiallyResolvedAudioTrack = {
      type: 'audio',
      id: 'audio-hi-0',
      url: 'https://example.com/audio/playlist.m3u8',
      groupId: 'audio-hi-0',
      name: 'Default',
      language: 'und',
      codecs: ['mp4a.40.2'],
      mimeType: 'audio/mp4',
      bandwidth: 0,
      sampleRate: 48000,
      channels: 2,
    };

    const [video, audio] = alignTrackTimelines([
      parseMediaPlaylist(liveCmafVideo, videoShell),
      parseMediaPlaylist(liveCmafAudio, audioShell),
    ]);

    const v82 = video?.segments.find((s) => s.id === 'segment-82');
    const a82 = audio?.segments.find((s) => s.id === 'segment-82');
    // Before alignment these disagreed (2 vs 0); after, the same instant matches.
    expect(v82?.startTime).toBe(a82?.startTime);
    expect(video?.startDate).toBe(audio?.startDate);
  });
});
