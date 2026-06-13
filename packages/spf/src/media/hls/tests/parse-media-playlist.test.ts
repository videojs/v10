import { describe, expect, it } from 'vitest';
import {
  getMediaPlaylistMetadata,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedTextTrack,
  type PartiallyResolvedVideoTrack,
} from '../../types';
import { parseMediaPlaylist } from '../parse-media-playlist';

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
  });
});
