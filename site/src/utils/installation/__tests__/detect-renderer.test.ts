import { describe, expect, it } from 'vitest';
import { articleFor, detectRenderer, extractMuxPlaybackId, isRendererValidForUseCase } from '../detect-renderer';

describe('detectRenderer', () => {
  describe('domain rules', () => {
    it('detects youtube.com', () => {
      expect(detectRenderer('https://www.youtube.com/watch?v=abc123', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
    });

    it('detects youtu.be', () => {
      expect(detectRenderer('https://youtu.be/abc123', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
    });

    it('detects m.youtube.com', () => {
      expect(detectRenderer('https://m.youtube.com/watch?v=abc123', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
    });

    it('detects vimeo.com', () => {
      expect(detectRenderer('https://vimeo.com/123456', 'default-video')).toEqual({
        renderer: 'vimeo',
        label: 'Vimeo',
      });
    });

    it('detects player.vimeo.com', () => {
      expect(detectRenderer('https://player.vimeo.com/video/123456', 'default-video')).toEqual({
        renderer: 'vimeo',
        label: 'Vimeo',
      });
    });

    it('detects stream.mux.com for default-video', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'default-video')).toEqual({
        renderer: 'mux-video',
        label: 'Mux',
      });
    });

    it('detects stream.mux.com for default-audio', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'default-audio')).toEqual({
        renderer: 'mux-audio',
        label: 'Mux',
      });
    });

    it('detects stream.mux.com for background-video', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'background-video')).toEqual({
        renderer: 'mux-background-video',
        label: 'Mux',
      });
    });

    it('detects open.spotify.com', () => {
      expect(detectRenderer('https://open.spotify.com/track/abc123', 'default-audio')).toEqual({
        renderer: 'spotify',
        label: 'Spotify',
      });
    });

    it('detects watch.videodelivery.net', () => {
      expect(detectRenderer('https://watch.videodelivery.net/abc123', 'default-video')).toEqual({
        renderer: 'cloudflare',
        label: 'Cloudflare',
      });
    });

    it('detects videodelivery.net', () => {
      expect(detectRenderer('https://videodelivery.net/abc123', 'default-video')).toEqual({
        renderer: 'cloudflare',
        label: 'Cloudflare',
      });
    });

    it('detects cloudflarestream.com', () => {
      expect(detectRenderer('https://cloudflarestream.com/abc123/manifest/video.m3u8', 'default-video')).toEqual({
        renderer: 'cloudflare',
        label: 'Cloudflare',
      });
    });

    it('detects cdn.jwplayer.com', () => {
      expect(detectRenderer('https://cdn.jwplayer.com/players/abc123.html', 'default-video')).toEqual({
        renderer: 'jwplayer',
        label: 'JW Player',
      });
    });

    it('detects content.jwplatform.com', () => {
      expect(detectRenderer('https://content.jwplatform.com/videos/abc123.mp4', 'default-video')).toEqual({
        renderer: 'jwplayer',
        label: 'JW Player',
      });
    });

    it('detects fast.wistia.com', () => {
      expect(detectRenderer('https://fast.wistia.com/medias/abc123', 'default-video')).toEqual({
        renderer: 'wistia',
        label: 'Wistia',
      });
    });

    it('detects fast.wistia.net', () => {
      expect(detectRenderer('https://fast.wistia.net/medias/abc123', 'default-video')).toEqual({
        renderer: 'wistia',
        label: 'Wistia',
      });
    });

    it('detects *.wistia.com', () => {
      expect(detectRenderer('https://mycompany.wistia.com/medias/abc123', 'default-video')).toEqual({
        renderer: 'wistia',
        label: 'Wistia',
      });
    });
  });

  describe('extension rules', () => {
    it('detects .m3u8 as HLS', () => {
      expect(detectRenderer('https://example.com/video.m3u8', 'default-video')).toEqual({
        renderer: 'hls',
        label: 'HLS',
      });
    });

    it('detects .mpd as DASH', () => {
      expect(detectRenderer('https://example.com/video.mpd', 'default-video')).toEqual({
        renderer: 'dash',
        label: 'DASH',
      });
    });

    it('detects .mp4 as HTML5 Video', () => {
      expect(detectRenderer('https://example.com/video.mp4', 'default-video')).toEqual({
        renderer: 'html5-video',
        label: 'HTML5 Video',
      });
    });

    it('detects .webm as HTML5 Video', () => {
      expect(detectRenderer('https://example.com/video.webm', 'default-video')).toEqual({
        renderer: 'html5-video',
        label: 'HTML5 Video',
      });
    });

    it('detects .mov as HTML5 Video', () => {
      expect(detectRenderer('https://example.com/video.mov', 'default-video')).toEqual({
        renderer: 'html5-video',
        label: 'HTML5 Video',
      });
    });

    it('detects .ogv as HTML5 Video', () => {
      expect(detectRenderer('https://example.com/video.ogv', 'default-video')).toEqual({
        renderer: 'html5-video',
        label: 'HTML5 Video',
      });
    });

    it('detects .mp3 as HTML5 Audio', () => {
      expect(detectRenderer('https://example.com/audio.mp3', 'default-audio')).toEqual({
        renderer: 'html5-audio',
        label: 'HTML5 Audio',
      });
    });

    it('detects .wav as HTML5 Audio', () => {
      expect(detectRenderer('https://example.com/audio.wav', 'default-audio')).toEqual({
        renderer: 'html5-audio',
        label: 'HTML5 Audio',
      });
    });

    it('detects .ogg as HTML5 Audio', () => {
      expect(detectRenderer('https://example.com/audio.ogg', 'default-audio')).toEqual({
        renderer: 'html5-audio',
        label: 'HTML5 Audio',
      });
    });

    it('detects .flac as HTML5 Audio', () => {
      expect(detectRenderer('https://example.com/audio.flac', 'default-audio')).toEqual({
        renderer: 'html5-audio',
        label: 'HTML5 Audio',
      });
    });

    it('detects .aac as HTML5 Audio', () => {
      expect(detectRenderer('https://example.com/audio.aac', 'default-audio')).toEqual({
        renderer: 'html5-audio',
        label: 'HTML5 Audio',
      });
    });

    it('strips query params when checking extension', () => {
      expect(detectRenderer('https://example.com/video.mp4?token=abc', 'default-video')).toEqual({
        renderer: 'html5-video',
        label: 'HTML5 Video',
      });
    });
  });

  describe('domain priority over extension', () => {
    it('stream.mux.com with .m3u8 detects as Mux, not HLS', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'default-video')).toEqual({
        renderer: 'mux-video',
        label: 'Mux',
      });
    });

    it('content.jwplatform.com with .mp4 detects as JW Player, not HTML5 Video', () => {
      expect(detectRenderer('https://content.jwplatform.com/videos/abc.mp4', 'default-video')).toEqual({
        renderer: 'jwplayer',
        label: 'JW Player',
      });
    });
  });

  describe('URL without protocol', () => {
    it('auto-prepends https://', () => {
      expect(detectRenderer('youtube.com/watch?v=abc', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
    });

    it('auto-prepends https:// for extension-based detection', () => {
      expect(detectRenderer('example.com/video.mp4', 'default-video')).toEqual({
        renderer: 'html5-video',
        label: 'HTML5 Video',
      });
    });
  });

  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(detectRenderer('', 'default-video')).toBeNull();
    });

    it('returns null for whitespace', () => {
      expect(detectRenderer('   ', 'default-video')).toBeNull();
    });

    it('returns null for garbage input', () => {
      expect(detectRenderer('not a url at all!!!', 'default-video')).toBeNull();
    });

    it('returns null for unknown domain and no extension', () => {
      expect(detectRenderer('https://example.com/page', 'default-video')).toBeNull();
    });
  });

  describe('use-case filtering', () => {
    it('returns null for YouTube with audio use case', () => {
      expect(detectRenderer('https://www.youtube.com/watch?v=abc', 'default-audio')).toBeNull();
    });

    it('returns null for YouTube with background-video use case', () => {
      expect(detectRenderer('https://www.youtube.com/watch?v=abc', 'background-video')).toBeNull();
    });

    it('returns null for Spotify with default-video use case', () => {
      expect(detectRenderer('https://open.spotify.com/track/abc', 'default-video')).toBeNull();
    });

    it('returns null for .mp3 with default-video use case', () => {
      expect(detectRenderer('https://example.com/audio.mp3', 'default-video')).toBeNull();
    });

    it('returns null for .mp4 with default-audio use case', () => {
      expect(detectRenderer('https://example.com/video.mp4', 'default-audio')).toBeNull();
    });
  });
});

describe('extractMuxPlaybackId', () => {
  it('extracts playback ID from stream.mux.com URL with .m3u8', () => {
    expect(extractMuxPlaybackId('https://stream.mux.com/abc123.m3u8')).toBe('abc123');
  });

  it('extracts playback ID from stream.mux.com URL without extension', () => {
    expect(extractMuxPlaybackId('https://stream.mux.com/abc123')).toBe('abc123');
  });

  it('returns null for non-Mux URL', () => {
    expect(extractMuxPlaybackId('https://example.com/abc123.m3u8')).toBeNull();
  });

  it('returns null for mux.com (not stream.mux.com)', () => {
    expect(extractMuxPlaybackId('https://mux.com/abc123')).toBeNull();
  });

  it('returns null for empty URL', () => {
    expect(extractMuxPlaybackId('')).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(extractMuxPlaybackId('not a url')).toBeNull();
  });

  it('returns null for stream.mux.com with no path segment', () => {
    expect(extractMuxPlaybackId('https://stream.mux.com/')).toBeNull();
  });
});

describe('articleFor', () => {
  it('returns "an" for hls', () => {
    expect(articleFor('hls')).toBe('an');
  });

  it('returns "an" for html5-video', () => {
    expect(articleFor('html5-video')).toBe('an');
  });

  it('returns "an" for html5-audio', () => {
    expect(articleFor('html5-audio')).toBe('an');
  });

  it('returns "a" for youtube', () => {
    expect(articleFor('youtube')).toBe('a');
  });

  it('returns "a" for vimeo', () => {
    expect(articleFor('vimeo')).toBe('a');
  });

  it('returns "a" for mux-video', () => {
    expect(articleFor('mux-video')).toBe('a');
  });

  it('returns "a" for dash', () => {
    expect(articleFor('dash')).toBe('a');
  });

  it('returns "a" for jwplayer', () => {
    expect(articleFor('jwplayer')).toBe('a');
  });
});

describe('isRendererValidForUseCase', () => {
  it('html5-video is valid for default-video', () => {
    expect(isRendererValidForUseCase('html5-video', 'default-video')).toBe(true);
  });

  it('youtube is valid for default-video', () => {
    expect(isRendererValidForUseCase('youtube', 'default-video')).toBe(true);
  });

  it('youtube is not valid for default-audio', () => {
    expect(isRendererValidForUseCase('youtube', 'default-audio')).toBe(false);
  });

  it('html5-audio is valid for default-audio', () => {
    expect(isRendererValidForUseCase('html5-audio', 'default-audio')).toBe(true);
  });

  it('spotify is valid for default-audio', () => {
    expect(isRendererValidForUseCase('spotify', 'default-audio')).toBe(true);
  });

  it('background-video is valid for background-video', () => {
    expect(isRendererValidForUseCase('background-video', 'background-video')).toBe(true);
  });

  it('html5-video is not valid for default-audio', () => {
    expect(isRendererValidForUseCase('html5-video', 'default-audio')).toBe(false);
  });

  it('html5-video is not valid for background-video', () => {
    expect(isRendererValidForUseCase('html5-video', 'background-video')).toBe(false);
  });
});
