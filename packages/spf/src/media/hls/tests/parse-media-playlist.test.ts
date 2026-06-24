import { describe, expect, it } from 'vitest';
import {
  getMediaPlaylistMetadata,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedTextTrack,
  type PartiallyResolvedVideoTrack,
} from '../../types';
import { parseMediaPlaylist } from '../parse-media-playlist';
import liveCmafAudio from './fixtures/live-cmaf-audio.m3u8?raw';
import liveCmafVideo from './fixtures/live-cmaf-video.m3u8?raw';
import liveTsVideo1 from './fixtures/live-ts-video-1.m3u8?raw';
import liveTsVideo2 from './fixtures/live-ts-video-2.m3u8?raw';
import liveTsVideo3 from './fixtures/live-ts-video-3.m3u8?raw';

describe('parseMediaPlaylist', () => {
  describe('Video tracks', () => {
    const unresolvedVideo: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'video-0',
      url: 'https://example.com/video/playlist.m3u8',
      bandwidth: 1400000,
      width: 1280,
      height: 720,
      codecs: ['avc1.4d401f'],
      frameRate: { frameRateNumerator: 30 },
      mimeType: 'video/mp4',
    };

    it('returns VideoTrack for PartiallyResolvedVideoTrack input (type inference)', () => {
      const playlistText = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:6
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.005,
segment0.m4s
#EXTINF:5.005,
segment1.m4s
#EXT-X-ENDLIST`;

      // Argument order: text first, unresolved second
      const result = parseMediaPlaylist(playlistText, unresolvedVideo);

      // TypeScript should infer result as VideoTrack
      expect(result.type).toBe('video');
      expect(result.id).toBe('video-0');
      expect(result.url).toBe('https://example.com/video/playlist.m3u8');
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.bandwidth).toBe(1400000);
      expect(result.startTime).toBe(0);
      expect(result.segments).toHaveLength(2);
    });

    it('returns HAM-compliant VideoTrack (Track & video-specific)', () => {
      const playlistText = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
segment.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedVideo);

      // HAM composition: Ham & AddressableObject & TimeSpan & Track
      expect(result.id).toBeDefined(); // Ham
      expect(result.url).toBeDefined(); // AddressableObject
      expect(result.startTime).toBe(0); // TimeSpan
      expect(result.duration).toBe(5.0); // TimeSpan
      expect(result.segments).toBeDefined(); // Track
      expect(result.initialization).toBeDefined(); // Track

      // Video-specific
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.frameRate).toBeDefined();
    });

    it('segments follow HAM Segment type (Ham & AddressableObject & Duration)', () => {
      const playlistText = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
seg0.m4s
#EXTINF:6.0,
seg1.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedVideo);

      const seg0 = result.segments[0];
      expect(seg0).toBeDefined();
      expect(seg0!.id).toBe('segment-0'); // Ham
      expect(seg0!.url).toBe('https://example.com/video/seg0.m4s'); // AddressableObject
      expect(seg0!.duration).toBe(5.0); // Duration
      expect(seg0!.startTime).toBe(0); // Segment-specific
    });

    it('handles segment byte ranges (AddressableObject.byteRange)', () => {
      const playlistText = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
#EXT-X-BYTERANGE:1000@0
main.mp4
#EXTINF:5.0,
#EXT-X-BYTERANGE:1000@1000
main.mp4
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedVideo);

      expect(result.segments[0]?.byteRange).toEqual({ start: 0, end: 999 });
      expect(result.segments[1]?.byteRange).toEqual({ start: 1000, end: 1999 });
    });

    it('handles implicit byte range offsets', () => {
      const playlistText = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
#EXT-X-BYTERANGE:1000@0
main.mp4
#EXTINF:5.0,
#EXT-X-BYTERANGE:1000
main.mp4
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedVideo);

      expect(result.segments[0]?.byteRange).toEqual({ start: 0, end: 999 });
      expect(result.segments[1]?.byteRange).toEqual({ start: 1000, end: 1999 });
    });

    it('handles Mux CMAF video playlist', () => {
      const muxUnresolved: PartiallyResolvedVideoTrack = {
        type: 'video',
        id: 'video-0',
        url: 'https://example.com/video-med.m3u8',
        bandwidth: 1124200,
        width: 768,
        height: 432,
        codecs: ['avc1.64001f'],
        mimeType: 'video/mp4',
      };

      const muxPlaylist = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:6
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.005000,
chunk-00001.m4s
#EXTINF:5.005000,
chunk-00002.m4s
#EXTINF:5.005000,
chunk-00003.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(muxPlaylist, muxUnresolved);

      expect(result.type).toBe('video');
      expect(result.width).toBe(768);
      expect(result.height).toBe(432);
      expect(result.codecs).toEqual(['avc1.64001f']);
      expect(result.segments).toHaveLength(3);
      expect(result.duration).toBeCloseTo(15.015, 3);
      // Standard HLS: init.mp4 relative to /video-med.m3u8 → /init.mp4
      expect(result.initialization.url).toBe('https://example.com/init.mp4');
      expect(result.mimeType).toBe('video/mp4');
    });
  });

  describe('Audio tracks', () => {
    const unresolvedAudio: PartiallyResolvedAudioTrack = {
      type: 'audio',
      id: 'audio-0',
      url: 'https://example.com/audio/playlist.m3u8',
      groupId: 'audio-med-0',
      name: 'Default',
      language: 'und',
      codecs: ['mp4a.40.2'],
      // Type-specific defaults (from P1)
      mimeType: 'audio/mp4',
      bandwidth: 0,
      sampleRate: 48000,
      channels: 2,
    };

    it('returns AudioTrack for PartiallyResolvedAudioTrack input (type inference)', () => {
      const playlistText = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.005,
audio-chunk-00001.m4s
#EXTINF:5.005,
audio-chunk-00002.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedAudio);

      // TypeScript should infer result as AudioTrack
      expect(result.type).toBe('audio');
      expect(result.id).toBe('audio-0');
      expect(result.codecs).toEqual(['mp4a.40.2']);
      expect(result.language).toBe('und');
      expect(result.segments).toHaveLength(2);
      expect(result.bandwidth).toBe(0); // Default - not in multivariant for demuxed audio
    });

    it('returns HAM-compliant AudioTrack with audio-specific properties', () => {
      const playlistText = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
segment.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedAudio);

      expect(result.mimeType).toBe('audio/mp4');
      expect(result.sampleRate).toBe(48000); // Default
      expect(result.channels).toBe(2); // Default (stereo)
      expect(result.duration).toBe(5.0);
    });

    it('handles Mux CMAF audio playlist', () => {
      const muxAudio: PartiallyResolvedAudioTrack = {
        type: 'audio',
        id: 'audio-0',
        url: 'https://example.com/audio-hi.m3u8',
        groupId: 'audio-hi-0',
        name: 'Default',
        codecs: ['mp4a.40.2'],
        mimeType: 'audio/mp4',
        bandwidth: 0,
        sampleRate: 48000,
        channels: 2,
      };

      const playlistText = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:6
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.005000,
audio-chunk-00001.m4s
#EXTINF:5.005000,
audio-chunk-00002.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, muxAudio);

      expect(result.type).toBe('audio');
      expect(result.segments).toHaveLength(2);
      expect(result.duration).toBeCloseTo(10.01, 2);
    });
  });

  describe('Text tracks', () => {
    const unresolvedText: PartiallyResolvedTextTrack = {
      type: 'text',
      id: 'text-0',
      url: 'https://example.com/subs/en.m3u8',
      groupId: 'subs',
      label: 'English',
      kind: 'subtitles',
      language: 'en',
      default: true,
      // Type-specific defaults (from P1)
      mimeType: 'text/vtt',
      bandwidth: 0,
      codecs: [],
    };

    it('returns TextTrack for PartiallyResolvedTextTrack input (type inference)', () => {
      const playlistText = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10.0,
subtitle-00001.vtt
#EXTINF:10.0,
subtitle-00002.vtt
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedText);

      // TypeScript should infer result as TextTrack
      expect(result.type).toBe('text');
      expect(result.id).toBe('text-0');
      expect(result.label).toBe('English');
      expect(result.kind).toBe('subtitles');
      expect(result.language).toBe('en');
      expect(result.default).toBe(true);
      expect(result.segments).toHaveLength(2);
    });

    it('returns HAM-compliant TextTrack (no initialization for VTT)', () => {
      const playlistText = `#EXTM3U
#EXTINF:10.0,
subtitle.vtt
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlistText, unresolvedText);

      expect(result.mimeType).toBe('text/vtt');
      expect(result.duration).toBe(10.0);
      // TextTrack may not have initialization (VTT doesn't use init segments)
      expect(result.initialization).toBeUndefined();
    });
  });

  describe('container detection (non-fMP4)', () => {
    const unresolvedVideo: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'video-0',
      url: 'https://example.com/video/playlist.m3u8',
      bandwidth: 1400000,
      codecs: ['avc1.4d401f'],
      mimeType: 'video/mp4',
    };
    const unresolvedAudio: PartiallyResolvedAudioTrack = {
      type: 'audio',
      id: 'audio-0',
      url: 'https://example.com/audio/playlist.m3u8',
      bandwidth: 128000,
      codecs: ['mp4a.40.2'],
      groupId: 'audio',
      name: 'Default',
      sampleRate: 48000,
      channels: 2,
      mimeType: 'audio/mp4',
    };

    it('relabels to video/mp2t when there is no EXT-X-MAP and segments are .ts', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXTINF:6.0,
segment0.ts
#EXTINF:6.0,
segment1.ts
#EXT-X-ENDLIST`;
      expect(parseMediaPlaylist(playlist, unresolvedVideo).mimeType).toBe('video/mp2t');
    });

    it('uses video/mp2t for audio TS renditions too (no audio/mp2t)', () => {
      const playlist = `#EXTM3U
#EXTINF:6.0,
a0.ts
#EXT-X-ENDLIST`;
      expect(parseMediaPlaylist(playlist, unresolvedAudio).mimeType).toBe('video/mp2t');
    });

    it('ignores the query string when checking the .ts extension', () => {
      const playlist = `#EXTM3U
#EXTINF:6.0,
https://cdn.example.com/path/segment0.ts?token=abc123&expires=1
#EXT-X-ENDLIST`;
      expect(parseMediaPlaylist(playlist, unresolvedVideo).mimeType).toBe('video/mp2t');
    });

    it('keeps the fMP4 default when an EXT-X-MAP init segment is present (even with a .ts-less map)', () => {
      const playlist = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:6.0,
segment0.ts
#EXT-X-ENDLIST`;
      // EXT-X-MAP present ⇒ fMP4 by definition; never relabel.
      expect(parseMediaPlaylist(playlist, unresolvedVideo).mimeType).toBe('video/mp4');
    });

    it('relabels to audio/aac when there is no EXT-X-MAP and segments are .aac (raw ADTS)', () => {
      const playlist = `#EXTM3U
#EXTINF:9.98,
fileSequence0.aac
#EXTINF:9.98,
fileSequence1.aac
#EXT-X-ENDLIST`;
      expect(parseMediaPlaylist(playlist, unresolvedAudio).mimeType).toBe('audio/aac');
    });

    it('keeps the fMP4 default for an .aac rendition that has an EXT-X-MAP', () => {
      const playlist = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:9.98,
fileSequence0.aac
#EXT-X-ENDLIST`;
      expect(parseMediaPlaylist(playlist, unresolvedAudio).mimeType).toBe('audio/mp4');
    });

    it('keeps the fMP4 default when there is no map but the extension is unrecognized (e.g. .mp4)', () => {
      const playlist = `#EXTM3U
#EXTINF:6.0,
segment0.mp4
#EXT-X-ENDLIST`;
      expect(parseMediaPlaylist(playlist, unresolvedVideo).mimeType).toBe('video/mp4');
    });
  });

  describe('Live playlists', () => {
    const unresolvedVideo: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'video-0',
      url: 'https://example.com/video/playlist.m3u8',
      bandwidth: 1400000,
      codecs: ['avc1.4d401f'],
      mimeType: 'video/mp4',
    };

    it('reports Infinity duration for an unended live playlist (no ENDLIST, no PLAYLIST-TYPE)', () => {
      const playlist = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="init.mp4"
#EXTINF:6.0,
segment0.m4s
#EXTINF:6.0,
segment1.m4s`;

      const result = parseMediaPlaylist(playlist, unresolvedVideo);

      expect(result.duration).toBe(Number.POSITIVE_INFINITY);
      expect(result.startTime).toBe(0);
      expect(getMediaPlaylistMetadata(result)?.endList).toBe(false);
    });

    it('reports Infinity duration for an unended EVENT playlist', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:6.0,
segment0.m4s`;

      expect(parseMediaPlaylist(playlist, unresolvedVideo).duration).toBe(Number.POSITIVE_INFINITY);
    });

    it('anchors startTime at 0 on first parse, with media-sequence-derived segment ids', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:10
#EXTINF:6.0,
segment10.m4s
#EXTINF:6.0,
segment11.m4s`;

      const result = parseMediaPlaylist(playlist, unresolvedVideo);

      // No previous snapshot → the window anchors at 0 regardless of media sequence.
      expect(result.startTime).toBe(0);
      expect(result.segments.map((s) => s.startTime)).toEqual([0, 6]);
      // Segment ids are media-sequence-derived, so they stay stable across reloads.
      expect(result.segments.map((s) => s.id)).toEqual(['segment-10', 'segment-11']);
    });

    it('treats an ended live playlist as complete with finite duration', () => {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:5
#EXTINF:6.0,
segment5.m4s
#EXTINF:6.0,
segment6.m4s
#EXT-X-ENDLIST`;

      const result = parseMediaPlaylist(playlist, unresolvedVideo);

      expect(result.duration).toBe(12.0);
      expect(result.startTime).toBe(0); // first parse, no previous → anchored at 0
      expect(getMediaPlaylistMetadata(result)?.endList).toBe(true);
    });

    it('carries the timeline forward across reloads as the window slides', () => {
      const first = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.0,
segment0.m4s
#EXTINF:6.0,
segment1.m4s
#EXTINF:6.0,
segment2.m4s`;
      const previous = parseMediaPlaylist(first, unresolvedVideo);
      expect(previous.segments.map((s) => s.startTime)).toEqual([0, 6, 12]);

      // Window slid by one (media sequence 0 → 1) and gained a segment.
      const reload = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:6.0,
segment1.m4s
#EXTINF:6.0,
segment2.m4s
#EXTINF:6.0,
segment3.m4s`;
      const next = parseMediaPlaylist(reload, previous);

      // segment1 anchors to its prior start (6); the appended segment3 continues at 18.
      expect(next.segments.map((s) => s.startTime)).toEqual([6, 12, 18]);
      expect(next.segments.map((s) => s.id)).toEqual(['segment-1', 'segment-2', 'segment-3']);
    });

    it('appends without shifting when nothing rolls off (media sequence unchanged)', () => {
      const first = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.0,
segment0.m4s
#EXTINF:6.0,
segment1.m4s`;
      const previous = parseMediaPlaylist(first, unresolvedVideo);

      const reload = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.0,
segment0.m4s
#EXTINF:6.0,
segment1.m4s
#EXTINF:6.0,
segment2.m4s`;
      const next = parseMediaPlaylist(reload, previous);

      expect(next.segments.map((s) => s.startTime)).toEqual([0, 6, 12]);
    });

    it('estimates the timeline forward on a full window turnover (no overlap)', () => {
      const first = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:6.0,
segment0.m4s
#EXTINF:6.0,
segment1.m4s
#EXTINF:6.0,
segment2.m4s`;
      const previous = parseMediaPlaylist(first, unresolvedVideo); // ends at 18

      // Jump far ahead — no overlap (offset 10 ≥ 3 segments).
      const reload = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:10
#EXTINF:6.0,
segment10.m4s
#EXTINF:6.0,
segment11.m4s`;
      const next = parseMediaPlaylist(reload, previous);

      // anchor = previous end (18) + (offset 10 − 3) × 6 = 60
      expect(next.segments.map((s) => s.startTime)).toEqual([60, 66]);
    });

    it('bridges a full window turnover exactly via PDT, not the target-duration estimate', () => {
      // Actual segment duration (5s) is below the declared TARGETDURATION (6s), so
      // the target-duration estimate over-shoots — PDT (the spec-consistent
      // cross-reload reference) places the turnover window exactly.
      const first = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2024-01-01T00:00:00.000Z
#EXTINF:5.0,
segment0.m4s
#EXTINF:5.0,
segment1.m4s
#EXTINF:5.0,
segment2.m4s`;
      const previous = parseMediaPlaylist(first, unresolvedVideo); // [0, 5, 10], seg2 PDT = origin+10

      // Turnover (offset 10 ≥ 3), 50s of real elapsed (10 × 5s) — PDT says so.
      const reload = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:10
#EXT-X-PROGRAM-DATE-TIME:2024-01-01T00:00:50.000Z
#EXTINF:5.0,
segment10.m4s
#EXTINF:5.0,
segment11.m4s`;
      const next = parseMediaPlaylist(reload, previous);

      // PDT-exact: seg2 sits at 10 with PDT origin+10; seg10 is origin+50 → 10 + 40 = 50.
      // (The target-duration estimate would over-shoot to 15 + (10−3)×6 = 57.)
      expect(next.segments.map((s) => s.startTime)).toEqual([50, 55]);
    });
  });

  describe('EXT-X-PROGRAM-DATE-TIME', () => {
    const videoShell: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'video-0',
      url: 'https://example.com/video/playlist.m3u8',
      bandwidth: 1400000,
      width: 1280,
      height: 720,
      codecs: ['avc1.4d401f'],
      frameRate: { frameRateNumerator: 30 },
      mimeType: 'video/mp4',
    };
    const epoch = (iso: string) => Date.parse(iso) / 1000;

    it('captures the per-segment program date time in epoch seconds', () => {
      const text = `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z
#EXTINF:4,
s0.ts
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:04.000Z
#EXTINF:4,
s1.ts`;
      const r = parseMediaPlaylist(text, videoShell);
      expect(r.segments.map((s) => s.startDate)).toEqual([
        epoch('2026-01-01T00:00:00.000Z'),
        epoch('2026-01-01T00:00:04.000Z'),
      ]);
    });

    it('interpolates the date time forward via EXTINF when a tag is absent', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z
#EXTINF:4,
s0.ts
#EXTINF:4,
s1.ts
#EXTINF:4,
s2.ts`;
      const r = parseMediaPlaylist(text, videoShell);
      expect(r.segments.map((s) => s.startDate)).toEqual([
        epoch('2026-01-01T00:00:00.000Z'),
        epoch('2026-01-01T00:00:04.000Z'),
        epoch('2026-01-01T00:00:08.000Z'),
      ]);
    });

    it('re-anchors on an explicit tag rather than interpolating (discontinuity jump)', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z
#EXTINF:4,
s0.ts
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T01:00:00.000Z
#EXTINF:4,
s1.ts`;
      const r = parseMediaPlaylist(text, videoShell);
      // s1 takes the jumped absolute time, not s0 + 4s.
      expect(r.segments.map((s) => s.startDate)).toEqual([
        epoch('2026-01-01T00:00:00.000Z'),
        epoch('2026-01-01T01:00:00.000Z'),
      ]);
    });

    it('interpolates with each segment’s actual EXTINF, not a nominal duration', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z
#EXTINF:1.9,
s0.ts
#EXTINF:2.05,
s1.ts
#EXTINF:2.0,
s2.ts`;
      const r = parseMediaPlaylist(text, videoShell);
      const t0 = epoch('2026-01-01T00:00:00.000Z');
      expect(r.segments[0]?.startDate).toBeCloseTo(t0, 6);
      expect(r.segments[1]?.startDate).toBeCloseTo(t0 + 1.9, 6);
      expect(r.segments[2]?.startDate).toBeCloseTo(t0 + 1.9 + 2.05, 6);
    });

    it('leaves program date time undefined when the source carries no PDT', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:4,
s0.ts
#EXTINF:4,
s1.ts`;
      const r = parseMediaPlaylist(text, videoShell);
      expect(r.segments.every((s) => s.startDate === undefined)).toBe(true);
    });

    it('exposes Track.startDate as the wall-clock at the origin (startDate − startTime)', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:10.000Z
#EXTINF:4,
s0.ts
#EXTINF:4,
s1.ts`;
      // First parse anchors startTime at 0, so the origin maps to s0's wall clock.
      expect(parseMediaPlaylist(text, videoShell).startDate).toBe(epoch('2026-01-01T00:00:10.000Z'));
    });

    it('keeps Track.startDate stable as the window slides', () => {
      const first = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z
#EXTINF:4,
s0.ts
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:04.000Z
#EXTINF:4,
s1.ts`;
      const prev = parseMediaPlaylist(first, videoShell);
      expect(prev.startDate).toBe(epoch('2026-01-01T00:00:00.000Z'));

      // Window slid by one: s0 rolled off, s1 is now first (startTime carried to 4).
      const reload = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:04.000Z
#EXTINF:4,
s1.ts
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:08.000Z
#EXTINF:4,
s2.ts`;
      const next = parseMediaPlaylist(reload, prev);
      expect(next.segments[0]?.startTime).toBe(4); // window advanced
      expect(next.startDate).toBe(epoch('2026-01-01T00:00:00.000Z')); // origin unchanged
    });

    it('leaves Track.startDate undefined when the source carries no PDT', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:4,
s0.ts`;
      expect(parseMediaPlaylist(text, videoShell).startDate).toBeUndefined();
    });
  });

  describe('real Mux live snapshots (fixtures)', () => {
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

    it('carries the timeline forward across a non-uniform window slide (TS, media-seq 85→86→88)', () => {
      const s1 = parseMediaPlaylist(liveTsVideo1, videoShell);
      const s2 = parseMediaPlaylist(liveTsVideo2, s1);
      const s3 = parseMediaPlaylist(liveTsVideo3, s2);

      expect(s1.startTime).toBe(0); // first parse anchors at 0
      expect(s2.startTime).toBe(4); // slid by one segment (4s)
      expect(s3.startTime).toBe(12); // slid by TWO segments (8s) — the offset=2 path
      expect(s3.segments[0]?.id).toBe('segment-88');
      expect(s3.mimeType).toBe('video/mp2t'); // TS container detected
      // PDT rides through carry-forward unchanged (absolute, not re-based).
      expect(s3.segments[0]?.startDate).toBeDefined();
      expect(s3.segments.map((seg) => seg.startDate ?? 0)).toEqual(
        [...s3.segments.map((seg) => seg.startDate ?? 0)].sort((a, b) => a - b)
      );
    });

    it('parses CMAF/LL-HLS: fMP4 mime, init segment, ignores partial segments', () => {
      const video = parseMediaPlaylist(liveCmafVideo, videoShell);

      expect(video.mimeType).toBe('video/mp4'); // fMP4 — not relabeled to a TS/unplayable mime
      expect(video.initialization?.url).toContain('18446744073709551615.m4s'); // EXT-X-MAP
      expect(video.duration).toBe(Number.POSITIVE_INFINITY); // unended live
      // EXT-X-PART / PRELOAD-HINT / SERVER-CONTROL are ignored: only the 10
      // complete .m4s segments are parsed.
      expect(video.segments).toHaveLength(10);
      expect(video.segments.every((s) => /\/\d+\.m4s$/.test(s.url))).toBe(true);
    });

    it('aligns demuxed audio and video by PDT, where per-track startTime disagrees', () => {
      const video = parseMediaPlaylist(liveCmafVideo, videoShell);
      const audio = parseMediaPlaylist(liveCmafAudio, audioShell);

      const v82 = video.segments.find((s) => s.id === 'segment-82');
      const a82 = audio.segments.find((s) => s.id === 'segment-82');
      expect(v82).toBeDefined();
      expect(a82).toBeDefined();

      // Same real instant → identical absolute PDT (the cross-track sync anchor)…
      expect(v82?.startDate).toBe(a82?.startDate);
      // …even though per-track relative startTime disagrees by a full segment
      // (video's window starts one segment earlier). This 2s gap is exactly the
      // A/V misalignment that PDT-based alignment resolves and sequence-number
      // alignment would mask.
      expect(v82?.startTime).toBe(2);
      expect(a82?.startTime).toBe(0);
    });

    it('exposes per-track startDate whose audio/video delta is the relative skew', () => {
      const video = parseMediaPlaylist(liveCmafVideo, videoShell);
      const audio = parseMediaPlaylist(liveCmafAudio, audioShell);

      expect(video.startDate).toBeDefined();
      expect(audio.startDate).toBeDefined();
      // Each track's origin (startTime 0) sits at a different real instant —
      // audio's window starts one 2s segment later — so the startDate delta is
      // the relative A/V skew a cross-track aligner removes.
      expect((audio.startDate ?? 0) - (video.startDate ?? 0)).toBeCloseTo(2, 3);
    });
  });

  describe('pre-applied anchor (startDate on the unresolved shell)', () => {
    const shell: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'video-0',
      url: 'https://example.com/video/playlist.m3u8',
      bandwidth: 1400000,
      codecs: ['avc1.4d401f'],
      mimeType: 'video/mp4',
    };
    const epoch = (iso: string) => Date.parse(iso) / 1000;
    const anchor = epoch('2026-01-01T00:00:00.000Z');

    const withPdt = `#EXTM3U
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:5
#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:10.000Z
#EXTINF:2,
s5.m4s
#EXTINF:2,
s6.m4s`;

    it('places first-resolve segments by PDT relative to the pre-applied startDate', () => {
      const r = parseMediaPlaylist(withPdt, { ...shell, startDate: anchor });
      // segment.startTime = segment PDT − anchor (10s and 12s past media-time 0).
      expect(r.segments.map((s) => s.startTime)).toEqual([10, 12]);
      expect(r.startTime).toBe(10);
      // The recomputed track startDate reads back as the anchor.
      expect(r.startDate).toBe(anchor);
    });

    it('anchors at the local base 0 when the shell carries no startDate (unchanged)', () => {
      const r = parseMediaPlaylist(withPdt, shell);
      expect(r.segments.map((s) => s.startTime)).toEqual([0, 2]);
      expect(r.startTime).toBe(0);
    });

    it('falls back to the local base when the shell has a startDate but no segment carries PDT', () => {
      const noPdt = `#EXTM3U
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:5
#EXTINF:2,
s5.m4s
#EXTINF:2,
s6.m4s`;
      const r = parseMediaPlaylist(noPdt, { ...shell, startDate: anchor });
      expect(r.segments.map((s) => s.startTime)).toEqual([0, 2]);
      expect(r.startDate).toBeUndefined();
    });
  });
});
