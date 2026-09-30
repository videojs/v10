import { describe, expect, it } from 'vite-plus/test';

import { articleFor, resolveRenderer, resolveRendererCandidates, isRendererValidForUseCase } from '../index';

describe('resolveRenderer', () => {
  describe('domain rules', () => {
    it('resolves stream.mux.com as Mux (video), taking precedence over the .m3u8 extension rule', () => {
      expect(resolveRenderer('https://stream.mux.com/abc123.m3u8', 'default-video')).toBe('mux-video');
    });

    it('resolves a Mux host to mux-audio in an audio use case (falls through from the mux-video rule)', () => {
      expect(resolveRenderer('https://stream.mux.com/abc123.m3u8', 'default-audio')).toBe('mux-audio');
    });

    it('resolves a bare Mux playback ID as Mux', () => {
      expect(resolveRenderer('https://stream.mux.com/abc123', 'default-video')).toBe('mux-video');
      expect(resolveRenderer('https://stream.mux.com/abc123', 'default-audio')).toBe('mux-audio');
    });

    it('resolves Mux static renditions as native media for each preset', () => {
      const video = 'https://stream.mux.com/abc123/highest.mp4';
      const audio = 'https://stream.mux.com/abc123/audio.m4a';

      expect(resolveRenderer(video, 'default-video')).toBe('html5-video');
      expect(resolveRenderer(video, 'background-video')).toBe('background-video');
      expect(resolveRenderer(audio, 'default-audio')).toBe('html5-audio');
      expect(resolveRenderer(video, 'live-video')).toBeNull();
    });

    it('does not treat mux.com pages as Mux sources', () => {
      expect(resolveRenderer('https://www.mux.com/abc123', 'default-video')).toBeNull();
    });

    it('resolves vimeo.com as Vimeo', () => {
      expect(resolveRenderer('https://vimeo.com/76979871', 'default-video')).toBe('vimeo');
    });

    it('resolves player.vimeo.com as Vimeo', () => {
      expect(resolveRenderer('https://player.vimeo.com/video/76979871', 'default-video')).toBe('vimeo');
    });

    it('returns null for a Vimeo URL in an audio use case (no audio fallthrough)', () => {
      expect(resolveRenderer('https://vimeo.com/76979871', 'default-audio')).toBeNull();
    });

    it('resolves youtube.com and youtu.be as YouTube', () => {
      expect(resolveRenderer('https://www.youtube.com/watch?v=aqz-KE-bpKQ', 'default-video')).toBe('youtube');
      expect(resolveRenderer('https://youtu.be/aqz-KE-bpKQ', 'default-video')).toBe('youtube');
    });

    it('resolves the privacy-enhanced youtube-nocookie.com host as YouTube', () => {
      expect(resolveRenderer('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', 'default-video')).toBe('youtube');
    });

    it('resolves open.spotify.com as Spotify in an audio use case', () => {
      expect(resolveRenderer('https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M', 'default-audio')).toBe('spotify');
    });

    it('returns null for a Spotify URL in a video use case (audio-only renderer)', () => {
      expect(resolveRenderer('https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M', 'default-video')).toBeNull();
    });

    it('resolves videodelivery.net and per-customer cloudflarestream.com hosts as Cloudflare Stream', () => {
      expect(resolveRenderer('https://watch.videodelivery.net/bfbd585059e33391d67b0f1d15fe6ea4', 'default-video')).toBe(
        'cloudflare'
      );
      expect(
        resolveRenderer(
          'https://customer-abc123.cloudflarestream.com/bfbd585059e33391d67b0f1d15fe6ea4/iframe',
          'default-video'
        )
      ).toBe('cloudflare');
    });

    it('resolves tiktok.com as TikTok', () => {
      expect(resolveRenderer('https://www.tiktok.com/@_luwes/video/7527476667770522893', 'default-video')).toBe(
        'tiktok'
      );
    });

    it('returns null for vm.tiktok.com short links (no numeric video id to parse)', () => {
      expect(resolveRenderer('https://vm.tiktok.com/ZMhqBqQqQ/', 'default-video')).toBeNull();
    });

    it('resolves twitch.tv as Twitch', () => {
      expect(resolveRenderer('https://www.twitch.tv/videos/106400740', 'default-video')).toBe('twitch');
    });

    it('returns null for a provider page without a video', () => {
      expect(resolveRenderer('https://www.youtube.com/', 'default-video')).toBeNull();
      expect(resolveRenderer('https://vimeo.com/', 'default-video')).toBeNull();
    });

    it('returns null for clips.twitch.tv (clips are a different embed)', () => {
      expect(resolveRenderer('https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage', 'default-video')).toBeNull();
    });

    it('returns null for the embed-provider hosts in an audio use case (no audio fallthrough)', () => {
      expect(resolveRenderer('https://youtu.be/aqz-KE-bpKQ', 'default-audio')).toBeNull();
      expect(resolveRenderer('https://www.tiktok.com/@_luwes/video/7527476667770522893', 'default-audio')).toBeNull();
      expect(resolveRenderer('https://www.twitch.tv/videos/106400740', 'default-audio')).toBeNull();
    });
  });

  describe('extension rules', () => {
    it('resolves .m3u8 as HLS', () => {
      expect(resolveRenderer('https://example.com/video.m3u8', 'default-video')).toBe('hls');
    });

    it('uses the background-video variants for streaming background sources', () => {
      expect(resolveRenderer('https://example.com/video.m3u8', 'background-video')).toBe('hls-background-video');
      expect(resolveRenderer('https://stream.mux.com/abc123.m3u8', 'background-video')).toBe('mux-background-video');
    });

    it('resolves .mpd as DASH', () => {
      expect(resolveRenderer('https://example.com/video.mpd', 'default-video')).toBe('dash');
    });

    it('returns null for .mpd in an audio use case', () => {
      expect(resolveRenderer('https://example.com/video.mpd', 'default-audio')).toBeNull();
    });

    it('resolves .mp4 as HTML5 Video', () => {
      expect(resolveRenderer('https://example.com/video.mp4', 'default-video')).toBe('html5-video');
    });

    it('resolves .webm as HTML5 Video', () => {
      expect(resolveRenderer('https://example.com/video.webm', 'default-video')).toBe('html5-video');
    });

    it('resolves .mov as HTML5 Video', () => {
      expect(resolveRenderer('https://example.com/video.mov', 'default-video')).toBe('html5-video');
    });

    it('resolves .ogv as HTML5 Video', () => {
      expect(resolveRenderer('https://example.com/video.ogv', 'default-video')).toBe('html5-video');
    });

    it('resolves .mp3 as HTML5 Audio', () => {
      expect(resolveRenderer('https://example.com/audio.mp3', 'default-audio')).toBe('html5-audio');
    });

    it('resolves .m4a as HTML5 Audio', () => {
      expect(resolveRenderer('https://example.com/audio.m4a', 'default-audio')).toBe('html5-audio');
    });

    it('resolves .wav as HTML5 Audio', () => {
      expect(resolveRenderer('https://example.com/audio.wav', 'default-audio')).toBe('html5-audio');
    });

    it('resolves .ogg as HTML5 Audio', () => {
      expect(resolveRenderer('https://example.com/audio.ogg', 'default-audio')).toBe('html5-audio');
    });

    it('resolves .flac as HTML5 Audio', () => {
      expect(resolveRenderer('https://example.com/audio.flac', 'default-audio')).toBe('html5-audio');
    });

    it('resolves .aac as HTML5 Audio', () => {
      expect(resolveRenderer('https://example.com/audio.aac', 'default-audio')).toBe('html5-audio');
    });

    it('strips query params when checking extension', () => {
      expect(resolveRenderer('https://example.com/video.mp4?token=abc', 'default-video')).toBe('html5-video');
    });
  });

  describe('URL without protocol', () => {
    it('auto-prepends https:// for extension-based resolution', () => {
      expect(resolveRenderer('example.com/video.mp4', 'default-video')).toBe('html5-video');
    });
  });

  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(resolveRenderer('', 'default-video')).toBeNull();
    });

    it('returns null for whitespace', () => {
      expect(resolveRenderer('   ', 'default-video')).toBeNull();
    });

    it('returns null for garbage input', () => {
      expect(resolveRenderer('not a url at all!!!', 'default-video')).toBeNull();
    });

    it('returns null for unknown domain and no extension', () => {
      expect(resolveRenderer('https://example.com/page', 'default-video')).toBeNull();
    });
  });

  describe('use-case filtering', () => {
    it('returns null for .mp3 with default-video use case', () => {
      expect(resolveRenderer('https://example.com/audio.mp3', 'default-video')).toBeNull();
    });

    it('returns null for .mp4 with default-audio use case', () => {
      expect(resolveRenderer('https://example.com/video.mp4', 'default-audio')).toBeNull();
    });

    it('resolves .m3u8 as HLS for live-video', () => {
      expect(resolveRenderer('https://example.com/stream.m3u8', 'live-video')).toBe('hls');
    });

    it('resolves a Mux host to mux-audio for live-audio', () => {
      expect(resolveRenderer('https://stream.mux.com/abc123.m3u8', 'live-audio')).toBe('mux-audio');
    });

    // The live presets take streaming sources only, so a progressive file has no
    // valid renderer to detect.
    it('returns null for .mp4 with live-video use case', () => {
      expect(resolveRenderer('https://example.com/video.mp4', 'live-video')).toBeNull();
    });

    it('returns null for .m3u8 with live-audio use case (no HLS audio renderer)', () => {
      expect(resolveRenderer('https://example.com/stream.m3u8', 'live-audio')).toBeNull();
    });
  });
});

describe('resolveRendererCandidates', () => {
  it('lists the generic stream renderers after a provider for its manifests', () => {
    expect(resolveRendererCandidates('https://stream.mux.com/abc123.m3u8')).toEqual([
      'mux-video',
      'mux-audio',
      'mux-background-video',
      'hls',
      'hls-background-video',
    ]);
    expect(
      resolveRendererCandidates(
        'https://customer-abc123.cloudflarestream.com/bfbd585059e33391d67b0f1d15fe6ea4/manifest/video.mpd'
      )
    ).toEqual(['cloudflare', 'dash']);
  });

  it('lists only the provider for embed URLs', () => {
    expect(resolveRendererCandidates('https://youtu.be/aqz-KE-bpKQ')).toEqual(['youtube']);
    expect(resolveRendererCandidates('https://stream.mux.com/abc123')).toEqual([
      'mux-video',
      'mux-audio',
      'mux-background-video',
    ]);
  });

  it('returns no candidates for Wistia, which has no renderer yet', () => {
    expect(resolveRendererCandidates('https://fast.wistia.net/embed/iframe/e4a27b971d')).toEqual([]);
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
