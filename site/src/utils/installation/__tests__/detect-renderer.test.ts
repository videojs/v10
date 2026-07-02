import { describe, expect, it } from 'vitest';
import { articleFor, detectRenderer, isRendererValidForUseCase } from '../detect-renderer';

describe('detectRenderer', () => {
  describe('domain rules', () => {
    it('detects stream.mux.com as Mux (video), taking precedence over the .m3u8 extension rule', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'default-video')).toEqual({
        renderer: 'mux-video',
        label: 'Mux',
      });
    });

    it('resolves a Mux host to mux-audio in an audio use case (falls through from the mux-video rule)', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'default-audio')).toEqual({
        renderer: 'mux-audio',
        label: 'Mux',
      });
    });

    it('detects vimeo.com as Vimeo', () => {
      expect(detectRenderer('https://vimeo.com/648359100', 'default-video')).toEqual({
        renderer: 'vimeo',
        label: 'Vimeo',
      });
    });

    it('detects player.vimeo.com as Vimeo', () => {
      expect(detectRenderer('https://player.vimeo.com/video/648359100', 'default-video')).toEqual({
        renderer: 'vimeo',
        label: 'Vimeo',
      });
    });

    it('returns null for a Vimeo URL in an audio use case (no audio fallthrough)', () => {
      expect(detectRenderer('https://vimeo.com/648359100', 'default-audio')).toBeNull();
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

    it('returns null for .mpd in an audio use case', () => {
      expect(detectRenderer('https://example.com/video.mpd', 'default-audio')).toBeNull();
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

  it('dash and mux-video are valid for default-video', () => {
    expect(isRendererValidForUseCase('dash', 'default-video')).toBe(true);
    expect(isRendererValidForUseCase('mux-video', 'default-video')).toBe(true);
  });

  it('vimeo is valid for default-video but not default-audio', () => {
    expect(isRendererValidForUseCase('vimeo', 'default-video')).toBe(true);
    expect(isRendererValidForUseCase('vimeo', 'default-audio')).toBe(false);
  });

  it('mux-audio is valid for default-audio but not default-video', () => {
    expect(isRendererValidForUseCase('mux-audio', 'default-audio')).toBe(true);
    expect(isRendererValidForUseCase('mux-audio', 'default-video')).toBe(false);
  });
});
