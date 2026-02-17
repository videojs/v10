import { describe, expect, it } from 'vitest';
import type { PartiallyResolvedAudioTrack, PartiallyResolvedTextTrack, PartiallyResolvedVideoTrack } from '../../types';
import { parseMultivariantPlaylist } from '../parse-multivariant';

describe('parseMultivariantPlaylist', () => {
  const baseUrl = 'https://example.com/master.m3u8';

  it('returns a Presentation with basic structure', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('url', baseUrl);
    expect(result).toHaveProperty('selectionSets');
    expect(result).toHaveProperty('startTime', 0);
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

    const result = parseMultivariantPlaylist(text, { url: baseUrl });

    // Should have video selection set
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    expect(videoSet).toBeDefined();
    expect(videoSet?.switchingSets).toHaveLength(1);

    const videoTracks = videoSet?.switchingSets[0]?.tracks;
    expect(videoTracks).toHaveLength(3);

    // First track (360p)
    expect(videoTracks?.[0]).toMatchObject({
      type: 'video',
      bandwidth: 800000,
      width: 640,
      height: 360,
      codecs: ['avc1.4d401e'],
    });
    expect(typeof videoTracks?.[0]?.id).toBe('string');

    // Second track (720p)
    expect(videoTracks?.[1]).toMatchObject({
      type: 'video',
      bandwidth: 1400000,
      width: 1280,
      height: 720,
      codecs: ['avc1.4d401f'],
      mimeType: 'video/mp4',
    });
    expect(typeof videoTracks?.[1]?.id).toBe('string');

    // Third track (1080p) - verify all fields
    const track1080p = videoTracks?.[2] as PartiallyResolvedVideoTrack;
    expect(track1080p).toMatchObject({
      type: 'video',
      url: 'https://example.com/video-1080p.m3u8',
      bandwidth: 2800000,
      width: 1920,
      height: 1080,
      codecs: ['avc1.640028'],
      mimeType: 'video/mp4',
    });
    expect(typeof track1080p.id).toBe('string');
    // Optional fields not present
    expect(track1080p.frameRate).toBeUndefined();
    expect(track1080p.audioGroupId).toBeUndefined();
  });

  it('handles relative URLs by resolving against baseUrl', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000
../other/playlist.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]?.url).toBe('https://example.com/video/playlist.m3u8');
    expect(videoTracks?.[1]?.url).toBe('https://example.com/other/playlist.m3u8');
  });

  it('preserves absolute URLs without modification', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
https://cdn.example.com/video.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]?.url).toBe('https://cdn.example.com/video.m3u8');
  });

  it('handles playlist with only BANDWIDTH (no resolution or codecs)', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks?.[0]).toMatchObject({
      type: 'video',
      bandwidth: 800000,
    });
    const videoTrack = videoTracks?.[0] as PartiallyResolvedVideoTrack | undefined;
    expect(videoTrack?.width).toBeUndefined();
    expect(videoTrack?.height).toBeUndefined();
    expect(videoTrack?.codecs).toEqual([]); // Default when not in playlist
  });

  it('handles Windows line endings (CRLF)', () => {
    const text =
      '#EXTM3U\r\n#EXT-X-STREAM-INF:BANDWIDTH=800000\r\nvideo.m3u8\r\n#EXT-X-STREAM-INF:BANDWIDTH=1400000\r\nvideo2.m3u8';

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks).toHaveLength(2);
  });

  it('ignores comment lines', () => {
    const text = `#EXTM3U
# This is a comment
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    expect(videoTracks).toHaveLength(1);
  });

  it('handles empty playlist (only #EXTM3U)', () => {
    const text = `#EXTM3U`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });

    expect(result.selectionSets).toHaveLength(0);
  });

  it('parses FRAME-RATE attribute', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,FRAME-RATE=29.970
video.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
    const videoSet = result.selectionSets.find((s) => s.type === 'video');
    const videoTracks = videoSet?.switchingSets[0]?.tracks;

    const videoTrack = videoTracks?.[0] as PartiallyResolvedVideoTrack | undefined;
    expect(videoTrack?.frameRate).toEqual({
      frameRateNumerator: 30000,
      frameRateDenominator: 1001,
    });
  });

  it('returns PartiallyResolvedVideoTrack (no segments property)', () => {
    const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

    const result = parseMultivariantPlaylist(text, { url: baseUrl });
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
      const result = parseMultivariantPlaylist(muxPlaylist, { url: baseUrl });

      // Should have both video and audio selection sets
      expect(result.selectionSets).toHaveLength(2);

      const videoSet = result.selectionSets.find((s) => s.type === 'video');
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');

      expect(videoSet).toBeDefined();
      expect(audioSet).toBeDefined();
    });

    it('parses video tracks with AUDIO group reference', () => {
      const result = parseMultivariantPlaylist(muxPlaylist, { url: baseUrl });
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
      const result = parseMultivariantPlaylist(muxPlaylist, { url: baseUrl });
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');
      const audioTracks = audioSet?.switchingSets[0]?.tracks;

      expect(audioTracks).toHaveLength(3);

      expect(audioTracks?.map((t) => (t as PartiallyResolvedAudioTrack).groupId)).toEqual([
        'audio-hi-0',
        'audio-med-0',
        'audio-lo-0',
      ]);
    });

    it('extracts audio codecs from referencing streams', () => {
      const result = parseMultivariantPlaylist(muxPlaylist, { url: baseUrl });
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');
      const audioTracks = audioSet?.switchingSets[0]?.tracks;

      // audio-med-0 is referenced by video stream - should have codec
      const audioMed = audioTracks?.find((t) => (t as PartiallyResolvedAudioTrack).groupId === 'audio-med-0') as
        | PartiallyResolvedAudioTrack
        | undefined;
      expect(audioMed?.codecs).toEqual(['mp4a.40.2']);

      // audio-hi-0 is NOT referenced - no codec info
      const audioHi = audioTracks?.find((t) => (t as PartiallyResolvedAudioTrack).groupId === 'audio-hi-0') as
        | PartiallyResolvedAudioTrack
        | undefined;
      expect(audioHi?.codecs).toEqual([]); // Default when not extracted from streams
    });
  });

  describe('Subtitle tracks', () => {
    it('parses subtitle tracks from EXT-X-MEDIA TYPE=SUBTITLES', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",URI="subs-en.m3u8",DEFAULT=YES,AUTOSELECT=YES
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Spanish",LANGUAGE="es",URI="subs-es.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=800000,SUBTITLES="subs"
video.m3u8`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      const textTracks = textSet?.switchingSets[0]?.tracks;

      expect(textTracks).toHaveLength(2);

      const englishTrack = textTracks?.[0] as PartiallyResolvedTextTrack | undefined;
      expect(englishTrack).toMatchObject({
        type: 'text',
        label: 'English',
        language: 'en',
        kind: 'subtitles',
        default: true,
        autoselect: true,
      });
      expect(typeof englishTrack?.id).toBe('string');

      expect(textTracks?.[1]).toMatchObject({
        type: 'text',
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

      const result = parseMultivariantPlaylist(text, { url: baseUrl });
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      const textTracks = textSet?.switchingSets[0]?.tracks;

      const textTrack = textTracks?.[0] as PartiallyResolvedTextTrack | undefined;
      expect(textTrack?.forced).toBe(true);
    });

    it('skips subtitle tracks without URI', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English"
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });
      const textSet = result.selectionSets.find((s) => s.type === 'text');

      // No text tracks should be created without URI
      expect(textSet).toBeUndefined();
    });

    it('requires BOTH DEFAULT=YES and AUTOSELECT=YES to set default flag', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Only Default",LANGUAGE="en",URI="subs-default-only.m3u8",DEFAULT=YES
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Only Autoselect",LANGUAGE="es",URI="subs-auto-only.m3u8",AUTOSELECT=YES
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Both",LANGUAGE="fr",URI="subs-both.m3u8",DEFAULT=YES,AUTOSELECT=YES
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      const textTracks = textSet?.switchingSets[0]?.tracks as PartiallyResolvedTextTrack[] | undefined;

      expect(textTracks).toHaveLength(3);

      // DEFAULT=YES only: default flag should NOT be set (following hls.js pattern)
      const defaultOnly = textTracks?.[0];
      expect(defaultOnly?.label).toBe('Only Default');
      expect(defaultOnly?.default).toBeUndefined();
      expect(defaultOnly?.autoselect).toBeUndefined();

      // AUTOSELECT=YES only: default flag should NOT be set
      const autoselectOnly = textTracks?.[1];
      expect(autoselectOnly?.label).toBe('Only Autoselect');
      expect(autoselectOnly?.default).toBeUndefined();
      expect(autoselectOnly?.autoselect).toBe(true);

      // Both DEFAULT=YES and AUTOSELECT=YES: default flag SHOULD be set
      const both = textTracks?.[2];
      expect(both?.label).toBe('Both');
      expect(both?.default).toBe(true);
      expect(both?.autoselect).toBe(true);
    });

    it('parses autoselect attribute independently of default', () => {
      const text = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Auto Only",LANGUAGE="en",URI="subs-auto.m3u8",AUTOSELECT=YES
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="No Flags",LANGUAGE="es",URI="subs-none.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=800000
video.m3u8`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      const textTracks = textSet?.switchingSets[0]?.tracks as PartiallyResolvedTextTrack[] | undefined;

      expect(textTracks).toHaveLength(2);

      // Track with AUTOSELECT=YES
      const autoTrack = textTracks?.[0];
      expect(autoTrack?.autoselect).toBe(true);
      expect(autoTrack?.default).toBeUndefined();

      // Track without flags
      const normalTrack = textTracks?.[1];
      expect(normalTrack?.autoselect).toBeUndefined();
      expect(normalTrack?.default).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('handles empty lines and whitespace', () => {
      const text = `#EXTM3U

#EXT-X-STREAM-INF:BANDWIDTH=800000

video.m3u8

`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });
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

      const result = parseMultivariantPlaylist(text, { url: baseUrl });

      // Should parse without errors
      expect(result.selectionSets).toHaveLength(1);
    });

    it('returns empty selectionSets for playlist with no streams', () => {
      const text = `#EXTM3U
#EXT-X-VERSION:7`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });

      expect(result.selectionSets).toHaveLength(0);
    });

    it('parses complex real-world playlist with multiple audio groups and codecs', () => {
      const text = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS


#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2168183,BANDWIDTH=2177116,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=960x540,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v5/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=7968416,BANDWIDTH=8001098,CODECS="avc1.64002a,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v9/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6170000,BANDWIDTH=6312875,CODECS="avc1.64002a,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v8/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=4670769,BANDWIDTH=4943747,CODECS="avc1.64002a,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v7/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=3168702,BANDWIDTH=3216424,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=1280x720,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v6/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1265132,BANDWIDTH=1268994,CODECS="avc1.64001e,mp4a.40.2",RESOLUTION=768x432,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v4/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=895755,BANDWIDTH=902298,CODECS="avc1.64001e,mp4a.40.2",RESOLUTION=640x360,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v3/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=530721,BANDWIDTH=541052,CODECS="avc1.640015,mp4a.40.2",RESOLUTION=480x270,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud1",SUBTITLES="sub1"
v2/prog_index.m3u8


#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2390686,BANDWIDTH=2399619,CODECS="avc1.640020,ac-3",RESOLUTION=960x540,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v5/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=8190919,BANDWIDTH=8223601,CODECS="avc1.64002a,ac-3",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v9/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6392503,BANDWIDTH=6535378,CODECS="avc1.64002a,ac-3",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v8/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=4893272,BANDWIDTH=5166250,CODECS="avc1.64002a,ac-3",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v7/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=3391205,BANDWIDTH=3438927,CODECS="avc1.640020,ac-3",RESOLUTION=1280x720,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v6/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1487635,BANDWIDTH=1491497,CODECS="avc1.64001e,ac-3",RESOLUTION=768x432,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v4/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1118258,BANDWIDTH=1124801,CODECS="avc1.64001e,ac-3",RESOLUTION=640x360,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v3/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=753224,BANDWIDTH=763555,CODECS="avc1.640015,ac-3",RESOLUTION=480x270,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud2",SUBTITLES="sub1"
v2/prog_index.m3u8


#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2198686,BANDWIDTH=2207619,CODECS="avc1.640020,ec-3",RESOLUTION=960x540,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v5/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=7998919,BANDWIDTH=8031601,CODECS="avc1.64002a,ec-3",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v9/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6200503,BANDWIDTH=6343378,CODECS="avc1.64002a,ec-3",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v8/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=4701272,BANDWIDTH=4974250,CODECS="avc1.64002a,ec-3",RESOLUTION=1920x1080,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v7/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=3199205,BANDWIDTH=3246927,CODECS="avc1.640020,ec-3",RESOLUTION=1280x720,FRAME-RATE=60.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v6/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1295635,BANDWIDTH=1299497,CODECS="avc1.64001e,ec-3",RESOLUTION=768x432,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v4/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=926258,BANDWIDTH=932801,CODECS="avc1.64001e,ec-3",RESOLUTION=640x360,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v3/prog_index.m3u8
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=561224,BANDWIDTH=571555,CODECS="avc1.640015,ec-3",RESOLUTION=480x270,FRAME-RATE=30.000,CLOSED-CAPTIONS="cc1",AUDIO="aud3",SUBTITLES="sub1"
v2/prog_index.m3u8


#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=183689,BANDWIDTH=187492,CODECS="avc1.64002a",RESOLUTION=1920x1080,URI="v7/iframe_index.m3u8"
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=132672,BANDWIDTH=136398,CODECS="avc1.640020",RESOLUTION=1280x720,URI="v6/iframe_index.m3u8"
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=97767,BANDWIDTH=101378,CODECS="avc1.640020",RESOLUTION=960x540,URI="v5/iframe_index.m3u8"
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=75722,BANDWIDTH=77818,CODECS="avc1.64001e",RESOLUTION=768x432,URI="v4/iframe_index.m3u8"
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=63522,BANDWIDTH=65091,CODECS="avc1.64001e",RESOLUTION=640x360,URI="v3/iframe_index.m3u8"
#EXT-X-I-FRAME-STREAM-INF:AVERAGE-BANDWIDTH=39678,BANDWIDTH=40282,CODECS="avc1.640015",RESOLUTION=480x270,URI="v2/iframe_index.m3u8"


#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud1",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="2",URI="a1/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud2",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="6",URI="a2/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud3",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="6",URI="a3/prog_index.m3u8"


#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc1",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,INSTREAM-ID="CC1"


#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="sub1",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,FORCED=NO,URI="s1/en/prog_index.m3u8"
`;

      const result = parseMultivariantPlaylist(text, { url: baseUrl });

      // Should have video, audio, and text selection sets
      expect(result.selectionSets.length).toBeGreaterThanOrEqual(2);

      // Find video selection set
      const videoSet = result.selectionSets.find((s) => s.type === 'video');
      expect(videoSet).toBeDefined();
      expect(videoSet!.switchingSets).toBeDefined();

      // Should have 24 video variants (8 resolutions × 3 codec combinations)
      const allVideoTracks = videoSet!.switchingSets.flatMap((ss) => ss.tracks);
      expect(allVideoTracks.length).toBe(24);

      // Check first track details (960x540, 60fps, avc1+mp4a, aud1)
      const firstTrack = allVideoTracks.find((t) => t.bandwidth === 2177116);
      expect(firstTrack).toBeDefined();
      expect(firstTrack!.width).toBe(960);
      expect(firstTrack!.height).toBe(540);
      expect(firstTrack!.frameRate).toEqual({ frameRateNumerator: 60 });
      expect(firstTrack!.codecs).toContain('avc1.640020');
      expect(firstTrack!.url).toBe('https://example.com/v5/prog_index.m3u8');

      // Find audio selection set
      const audioSet = result.selectionSets.find((s) => s.type === 'audio');
      expect(audioSet).toBeDefined();
      expect(audioSet!.switchingSets.length).toBeGreaterThan(0);

      // Should have 3 audio groups (aud1, aud2, aud3)
      const allAudioTracks = audioSet!.switchingSets.flatMap((ss) => ss.tracks);
      expect(allAudioTracks.length).toBe(3);

      // Check audio track details
      const stereoTrack = allAudioTracks.find((t) => t.url.includes('a1/'));
      expect(stereoTrack).toBeDefined();

      // Find text/subtitle selection set
      const textSet = result.selectionSets.find((s) => s.type === 'text');
      expect(textSet).toBeDefined();

      // Should have subtitle track
      const allTextTracks = textSet!.switchingSets.flatMap((ss) => ss.tracks);
      expect(allTextTracks.length).toBeGreaterThan(0);
      expect(allTextTracks[0]?.url).toContain('s1/en/prog_index.m3u8');
    });
  });
});
