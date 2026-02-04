import { describe, expect, it } from 'vitest';
import type { UnresolvedAudioTrack, UnresolvedTextTrack, UnresolvedVideoTrack } from '../../types';
import { parseMultivariantPlaylist } from '../parse-multivariant';

describe('parseMultivariantPlaylist', () => {
  const baseUrl = 'https://example.com/master.m3u8';

  it('returns a Presentation with basic structure', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('baseUrl', baseUrl);
    expect(result).toHaveProperty('url', baseUrl);
    expect(result).toHaveProperty('selectionSets');
    expect(result.duration).toBeUndefined();
  });

  it('parses video streams with bandwidth, resolution, and codecs', () => {
    const text = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.4d401e,mp4a.40.2"
video-360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
video-720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
video-1080p.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);

    // Should have video selection set
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    expect(videoSet).toBeDefined();
    expect(videoSet?.switchingSets).toHaveLength(1);

    const videoTracks = videoSet?.switchingSets[0]?.tracks;
    expect(videoTracks).toHaveLength(3);

    // First track (360p)
    expect(videoTracks?.[0]).toMatchObject({
      type: 'video',
      id: 'video-0',
      bandwidth: 800000,
      width: 640,
      height: 360,
      codecs: ['avc1.4d401e'],
    });

    // Second track (720p)
    expect(videoTracks?.[1]).toMatchObject({
      type: 'video',
      id: 'video-1',
      bandwidth: 1400000,
      width: 1280,
      height: 720,
      codecs: ['avc1.4d401f'],
      mimeType: 'video/mp4',
      par: '1:1',
      sar: '1:1',
      scanType: 'progressive',
    });

    // Third track (1080p) - verify all fields are seed values for P2
    const track1080p = videoTracks?.[2] as UnresolvedVideoTrack;
    expect(track1080p).toEqual({
      type: 'video',
      id: 'video-2',
      url: 'https://example.com/video-1080p.m3u8',
      bandwidth: 2800000,
      width: 1920,
      height: 1080,
      codecs: ['avc1.640028'],
      // Type-specific defaults (seed values for P2)
      mimeType: 'video/mp4',
      par: '1:1',
      sar: '1:1',
      scanType: 'progressive',
      // Optional fields not present
      frameRate: undefined,
      audioGroupId: undefined,
    });
  });

  it('handles relative URLs by resolving against baseUrl', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000
../other/playlist.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]?.url).toBe('https://example.com/video/playlist.m3u8');
    expect(videoTracks?.[1]?.url).toBe('https://example.com/other/playlist.m3u8');
  });

  it('preserves absolute URLs without modification', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
https://cdn.example.com/video.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]?.url).toBe('https://cdn.example.com/video.m3u8');
  });

  it('handles playlist with only BANDWIDTH (no resolution or codecs)', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]).toMatchObject({
      type: 'video',
      bandwidth: 800000,
    });
    const videoTrack = videoTracks?.[0] as UnresolvedVideoTrack | undefined;
    expect(videoTrack?.width).toBeUndefined();
    expect(videoTrack?.height).toBeUndefined();
    expect(videoTrack?.codecs).toBeUndefined();
  });

  it('handles Windows line endings (CRLF)', () => {
    const text =
      '#EXTM3U\r\n#EXT-X-STREAM-INF:BANDWIDTH=800000\r\nvideo.m3u8\r\n#EXT-X-STREAM-INF:BANDWIDTH=1400000\r\nvideo2.m3u8';

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks).toHaveLength(2);
  });

  it('ignores comment lines', () => {
    const text = `#EXTM3U
# This is a comment
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks).toHaveLength(1);
  });

  it('handles empty playlist (only #EXTM3U)', () => {
    const text = `#EXTM3U`;

    const result = parseMultivariantPlaylist(text, baseUrl);

    expect(result.selectionSets).toHaveLength(0);
  });

  it('parses FRAME-RATE attribute', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,FRAME-RATE=29.970
video.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    const videoTrack = videoTracks?.[0] as UnresolvedVideoTrack | undefined;
    expect(videoTrack?.frameRate).toEqual({
      frameRateNumerator: 30000,
      frameRateDenominator: 1001,
    });
  });

  it('returns UnresolvedVideoTrack (no segments property)', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, baseUrl);
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]).toBeDefined();
    expect('segments' in (videoTracks?.[0] ?? {})).toBe(false);
    expect('initialization' in (videoTracks?.[0] ?? {})).toBe(false);
  });

  describe('Mux-style CMAF HLS', () => {
    // Real Mux playlist structure - demuxed audio + video
    const muxPlaylist = `#EXTM3U
#EXT-X-VERSION:5
#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-hi-0",NAME="Default",CHANNELS="2",AUTOSELECT=YES,DEFAULT=YES,LANGUAGE="und",URI="audio-hi.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-med-0",NAME="Default",CHANNELS="2",AUTOSELECT=YES,DEFAULT=YES,LANGUAGE="und",URI="audio-med.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-lo-0",NAME="Default",CHANNELS="2",AUTOSELECT=YES,DEFAULT=YES,LANGUAGE="und",URI="audio-lo.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1124200,AVERAGE-BANDWIDTH=1124200,CODECS="mp4a.40.2,avc1.64001f",AUDIO="audio-med-0",RESOLUTION=768x432,CLOSED-CAPTIONS=NONE
video-med.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=821700,AVERAGE-BANDWIDTH=821700,CODECS="mp4a.40.2,avc1.64001f",AUDIO="audio-lo-0",RESOLUTION=640x360,CLOSED-CAPTIONS=NONE
video-lo.m3u8`;

    it('parses Mux CMAF playlist with demuxed audio', () => {
      const result = parseMultivariantPlaylist(muxPlaylist, baseUrl);

      // Should have both video and audio selection sets
      expect(result.selectionSets).toHaveLength(2);

      const videoSet = result.selectionSets.find((s) => s.type === 'video');
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');

      expect(videoSet).toBeDefined();
      expect(audioSet).toBeDefined();
    });

    it('parses video tracks with AUDIO group reference', () => {
      const result = parseMultivariantPlaylist(muxPlaylist, baseUrl);
      const videoSet = result.selectionSets.find((s) => s.type === 'video');
      const videoTracks = videoSet?.switchingSets[0]?.tracks;

      expect(videoTracks).toHaveLength(2);

      expect(videoTracks?.[0]).toMatchObject({
        type: 'video',
        bandwidth: 1124200,
        width: 768,
        height: 432,
        codecs: ['avc1.64001f'],
        audioGroupId: 'audio-med-0',
      });

      expect(videoTracks?.[1]).toMatchObject({
        type: 'video',
        bandwidth: 821700,
        width: 640,
        height: 360,
        codecs: ['avc1.64001f'],
        audioGroupId: 'audio-lo-0',
      });
    });

    it('parses all audio tracks from EXT-X-MEDIA', () => {
      const result = parseMultivariantPlaylist(muxPlaylist, baseUrl);
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');
      const audioTracks = audioSet?.switchingSets[0]?.tracks;

      expect(audioTracks).toHaveLength(3);

      expect(audioTracks?.map((t) => (t as UnresolvedAudioTrack).groupId)).toEqual([
        'audio-hi-0',
        'audio-med-0',
        'audio-lo-0',
      ]);
    });

    it('extracts audio codecs from referencing streams', () => {
      const result = parseMultivariantPlaylist(muxPlaylist, baseUrl);
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');
      const audioTracks = audioSet?.switchingSets[0]?.tracks;

      // audio-med-0 is referenced by video stream - should have codec
      const audioMed = audioTracks?.find((t) => (t as UnresolvedAudioTrack).groupId === 'audio-med-0') as
        | UnresolvedAudioTrack
        | undefined;
      expect(audioMed?.codecs).toEqual(['mp4a.40.2']);

      // audio-hi-0 is NOT referenced - no codec info
      const audioHi = audioTracks?.find((t) => (t as UnresolvedAudioTrack).groupId === 'audio-hi-0') as
        | UnresolvedAudioTrack
        | undefined;
      expect(audioHi?.codecs).toBeUndefined();
    });
  });

  describe('Subtitle tracks', () => {
    it('parses subtitle tracks from EXT-X-MEDIA TYPE=SUBTITLES', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",URI="subs-en.m3u8",DEFAULT=YES
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Spanish",LANGUAGE="es",URI="subs-es.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=800000,SUBTITLES="subs"
video.m3u8`;

      const result = parseMultivariantPlaylist(text, baseUrl);
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      const textTracks = textSet?.switchingSets[0]?.tracks;

      expect(textTracks).toHaveLength(2);

      expect(textTracks?.[0]).toMatchObject({
        type: 'text',
        id: 'text-0',
        label: 'English',
        language: 'en',
        kind: 'subtitles',
        default: true,
      });

      expect(textTracks?.[1]).toMatchObject({
        type: 'text',
        id: 'text-1',
        label: 'Spanish',
        language: 'es',
        kind: 'subtitles',
      });
    });

    it('handles FORCED subtitle attribute', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English CC",LANGUAGE="en",URI="subs.m3u8",FORCED=YES
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

      const result = parseMultivariantPlaylist(text, baseUrl);
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      const textTracks = textSet?.switchingSets[0]?.tracks;

      const textTrack = textTracks?.[0] as UnresolvedTextTrack | undefined;
      expect(textTrack?.forced).toBe(true);
    });

    it('skips subtitle tracks without URI', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English"
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

      const result = parseMultivariantPlaylist(text, baseUrl);
      const textSet = result.selectionSets.find((s) => s.type === 'text');

      // No text tracks should be created without URI
      expect(textSet).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('handles empty lines and whitespace', () => {
      const text = `#EXTM3U

#EXT-X-STREAM-INF:BANDWIDTH=800000

video.m3u8

`;

      const result = parseMultivariantPlaylist(text, baseUrl);
      const videoSet = result.selectionSets.find((s) => s.type === 'video');
      const videoTracks = videoSet?.switchingSets[0]?.tracks;

      expect(videoTracks).toHaveLength(1);
    });

    it('skips #EXT-X-VERSION and other unsupported tags', () => {
      const text = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

      const result = parseMultivariantPlaylist(text, baseUrl);

      // Should parse without errors
      expect(result.selectionSets).toHaveLength(1);
    });

    it('returns empty selectionSets for playlist with no streams', () => {
      const text = `#EXTM3U
#EXT-X-VERSION:7`;

      const result = parseMultivariantPlaylist(text, baseUrl);

      expect(result.selectionSets).toHaveLength(0);
    });
  });
});
