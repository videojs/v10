import { describe, expect, it } from 'vitest';
import { articleFor, detectRenderer, isRendererValidForUseCase } from '../detect-renderer';

describe('detectRenderer', () => {
  describe('domain rules', () => {
    // Domain-specific rules (YouTube, Vimeo, Mux, Spotify, Cloudflare, JW Player, Wistia)
    // are commented out until their renderer elements are implemented.
    // Mux stream.mux.com URLs with .m3u8 extension are detected as HLS via extension rules.

    it('detects stream.mux.com .m3u8 as HLS', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'default-video')).toEqual({
        renderer: 'hls',
        label: 'HLS',
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

    // .mpd detection commented out until DASH renderer is implemented

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

  describe('URL without protocol', () => {
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
    it('returns null for .mp3 with default-video use case', () => {
      expect(detectRenderer('https://example.com/audio.mp3', 'default-video')).toBeNull();
    });

    it('returns null for .mp4 with default-audio use case', () => {
      expect(detectRenderer('https://example.com/video.mp4', 'default-audio')).toBeNull();
    });
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
});

describe('isRendererValidForUseCase', () => {
  it('html5-video is valid for default-video', () => {
    expect(isRendererValidForUseCase('html5-video', 'default-video')).toBe(true);
  });

  it('html5-audio is valid for default-audio', () => {
    expect(isRendererValidForUseCase('html5-audio', 'default-audio')).toBe(true);
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
