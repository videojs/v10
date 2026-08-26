import { describe, expect, it } from 'vite-plus/test';

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
      expect(detectRenderer('https://vimeo.com/76979871', 'default-video')).toEqual({
        renderer: 'vimeo',
        label: 'Vimeo',
      });
    });

    it('detects player.vimeo.com as Vimeo', () => {
      expect(detectRenderer('https://player.vimeo.com/video/76979871', 'default-video')).toEqual({
        renderer: 'vimeo',
        label: 'Vimeo',
      });
    });

    it('returns null for a Vimeo URL in an audio use case (no audio fallthrough)', () => {
      expect(detectRenderer('https://vimeo.com/76979871', 'default-audio')).toBeNull();
    });

    it('detects youtube.com and youtu.be as YouTube', () => {
      expect(detectRenderer('https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
      expect(detectRenderer('https://youtu.be/aqz-KE-bpKQ', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
    });

    it('detects the privacy-enhanced youtube-nocookie.com host as YouTube', () => {
      expect(detectRenderer('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 'default-video')).toEqual({
        renderer: 'youtube',
        label: 'YouTube',
      });
    });

    it('detects open.spotify.com as Spotify in an audio use case', () => {
      expect(detectRenderer('https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M', 'default-audio')).toEqual({
        renderer: 'spotify',
        label: 'Spotify',
      });
    });

    it('returns null for a Spotify URL in a video use case (audio-only renderer)', () => {
      expect(detectRenderer('https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M', 'default-video')).toBeNull();
    });

    it('detects videodelivery.net and per-customer cloudflarestream.com hosts as Cloudflare Stream', () => {
      expect(
        detectRenderer('https://watch.videodelivery.net/bfbd585059e33391d67b0f1d15fe6ea4', 'default-video')
      ).toEqual({
        renderer: 'cloudflare',
        label: 'Cloudflare Stream',
      });
      expect(
        detectRenderer(
          'https://customer-abc123.cloudflarestream.com/bfbd585059e33391d67b0f1d15fe6ea4/iframe',
          'default-video'
        )
      ).toEqual({
        renderer: 'cloudflare',
        label: 'Cloudflare Stream',
      });
    });

    it('detects tiktok.com as TikTok', () => {
      expect(detectRenderer('https://www.tiktok.com/@_luwes/video/7527476667770522893', 'default-video')).toEqual({
        renderer: 'tiktok',
        label: 'TikTok',
      });
    });

    it('returns null for vm.tiktok.com short links (no numeric video id to parse)', () => {
      expect(detectRenderer('https://vm.tiktok.com/ZMhqBqQqQ/', 'default-video')).toBeNull();
    });

    it('detects twitch.tv as Twitch', () => {
      expect(detectRenderer('https://www.twitch.tv/videos/106400740', 'default-video')).toEqual({
        renderer: 'twitch',
        label: 'Twitch',
      });
    });

    it('returns null for clips.twitch.tv (clips are a different embed)', () => {
      expect(detectRenderer('https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage', 'default-video')).toBeNull();
    });

    it('returns null for the embed-provider hosts in an audio use case (no audio fallthrough)', () => {
      expect(detectRenderer('https://youtu.be/aqz-KE-bpKQ', 'default-audio')).toBeNull();
      expect(detectRenderer('https://www.tiktok.com/@_luwes/video/7527476667770522893', 'default-audio')).toBeNull();
      expect(detectRenderer('https://www.twitch.tv/videos/106400740', 'default-audio')).toBeNull();
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

    it('detects .m3u8 as HLS for live-video', () => {
      expect(detectRenderer('https://example.com/stream.m3u8', 'live-video')).toEqual({
        renderer: 'hls',
        label: 'HLS',
      });
    });

    it('resolves a Mux host to mux-audio for live-audio', () => {
      expect(detectRenderer('https://stream.mux.com/abc123.m3u8', 'live-audio')).toEqual({
        renderer: 'mux-audio',
        label: 'Mux',
      });
    });

    // The live presets take streaming sources only, so a progressive file has no
    // valid renderer to detect.
    it('returns null for .mp4 with live-video use case', () => {
      expect(detectRenderer('https://example.com/video.mp4', 'live-video')).toBeNull();
    });

    it('returns null for .m3u8 with live-audio use case (no HLS audio renderer)', () => {
      expect(detectRenderer('https://example.com/stream.m3u8', 'live-audio')).toBeNull();
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

  it('the embed video renderers are valid for default-video but not default-audio', () => {
    for (const renderer of ['youtube', 'cloudflare', 'tiktok', 'twitch'] as const) {
      expect(isRendererValidForUseCase(renderer, 'default-video')).toBe(true);
      expect(isRendererValidForUseCase(renderer, 'default-audio')).toBe(false);
    }
  });

  it('spotify is valid for default-audio but not default-video', () => {
    expect(isRendererValidForUseCase('spotify', 'default-audio')).toBe(true);
    expect(isRendererValidForUseCase('spotify', 'default-video')).toBe(false);
  });

  it('mux-audio is valid for default-audio but not default-video', () => {
    expect(isRendererValidForUseCase('mux-audio', 'default-audio')).toBe(true);
    expect(isRendererValidForUseCase('mux-audio', 'default-video')).toBe(false);
  });

  it('live-video accepts live-aware renderers', () => {
    expect(isRendererValidForUseCase('hls', 'live-video')).toBe(true);
    expect(isRendererValidForUseCase('mux-video', 'live-video')).toBe(true);
    expect(isRendererValidForUseCase('dash', 'live-video')).toBe(false);
    expect(isRendererValidForUseCase('html5-video', 'live-video')).toBe(false);
    expect(isRendererValidForUseCase('vimeo', 'live-video')).toBe(false);
  });

  it('live-audio accepts only mux-audio', () => {
    expect(isRendererValidForUseCase('mux-audio', 'live-audio')).toBe(true);
    expect(isRendererValidForUseCase('html5-audio', 'live-audio')).toBe(false);
    expect(isRendererValidForUseCase('hls', 'live-audio')).toBe(false);
  });
});
