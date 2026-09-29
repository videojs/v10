import { describe, expect, it } from 'vite-plus/test';

import { type DetectedMediaSource, detectMediaSource } from '../detect';

describe('detectMediaSource', () => {
  it.each<[string, DetectedMediaSource]>([
    [
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      { kind: 'youtube', src: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', id: 'aqz-KE-bpKQ' },
    ],
    ['https://youtu.be/aqz-KE-bpKQ', { kind: 'youtube', src: 'https://youtu.be/aqz-KE-bpKQ', id: 'aqz-KE-bpKQ' }],
    ['youtu.be/aqz-KE-bpKQ', { kind: 'youtube', src: 'youtu.be/aqz-KE-bpKQ', id: 'aqz-KE-bpKQ' }],
    [
      'https://m.youtube.com/shorts/aqz-KE-bpKQ',
      { kind: 'youtube', src: 'https://m.youtube.com/shorts/aqz-KE-bpKQ', id: 'aqz-KE-bpKQ' },
    ],
    [
      'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
      { kind: 'youtube', src: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ', id: 'aqz-KE-bpKQ' },
    ],
    [
      'https://www.youtube.com/playlist?list=PLv3TTBr1W_9tppikBxAE',
      {
        kind: 'youtube',
        src: 'https://www.youtube.com/playlist?list=PLv3TTBr1W_9tppikBxAE',
        id: 'PLv3TTBr1W_9tppikBxAE',
      },
    ],
    ['https://vimeo.com/76979871', { kind: 'vimeo', src: 'https://vimeo.com/76979871', id: '76979871' }],
    [
      'https://player.vimeo.com/video/76979871?h=8272103f6e',
      { kind: 'vimeo', src: 'https://player.vimeo.com/video/76979871?h=8272103f6e', id: '76979871' },
    ],
    [
      'https://fast.wistia.net/embed/iframe/e4a27b971d',
      { kind: 'wistia', src: 'https://fast.wistia.net/embed/iframe/e4a27b971d', id: 'e4a27b971d' },
    ],
    [
      'https://example.com/page?wvideo=e4a27b971d',
      { kind: 'wistia', src: 'https://example.com/page?wvideo=e4a27b971d', id: 'e4a27b971d' },
    ],
    [
      'https://stream.mux.com/a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M.m3u8',
      {
        kind: 'mux',
        src: 'https://stream.mux.com/a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M.m3u8',
        id: 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M',
      },
    ],
    [
      'https://customer-abc123.cloudflarestream.com/5d5bc37ffcf54c9b82e996823bffbb81/manifest/video.m3u8',
      {
        kind: 'cloudflare',
        src: 'https://customer-abc123.cloudflarestream.com/5d5bc37ffcf54c9b82e996823bffbb81/manifest/video.m3u8',
        id: '5d5bc37ffcf54c9b82e996823bffbb81',
      },
    ],
    [
      'https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M',
      { kind: 'spotify', src: 'https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M', id: '1301WleyT98MSxVHPZCA6M' },
    ],
    [
      'spotify:episode:7makk4oTQel546B0PZlDM5',
      { kind: 'spotify', src: 'spotify:episode:7makk4oTQel546B0PZlDM5', id: '7makk4oTQel546B0PZlDM5' },
    ],
    [
      'https://www.tiktok.com/@scout2015/video/6718335390845095173',
      {
        kind: 'tiktok',
        src: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
        id: '6718335390845095173',
      },
    ],
    [
      'https://www.twitch.tv/videos/2175470236',
      { kind: 'twitch', src: 'https://www.twitch.tv/videos/2175470236', id: '2175470236' },
    ],
    ['https://www.twitch.tv/monstercat', { kind: 'twitch', src: 'https://www.twitch.tv/monstercat', id: 'monstercat' }],
  ])('detects the provider of %s', (src, expected) => {
    expect(detectMediaSource(src)).toEqual(expected);
  });

  describe('Vidstack shorthands', () => {
    it('expands youtube/<id> to a privacy-enhanced embed URL', () => {
      expect(detectMediaSource('youtube/aqz-KE-bpKQ')).toEqual({
        kind: 'youtube',
        src: 'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ',
        id: 'aqz-KE-bpKQ',
      });

      expect(detectMediaSource('youtube/shorts/aqz-KE-bpKQ')?.id).toBe('aqz-KE-bpKQ');
    });

    it('expands vimeo/<id> to a Vimeo URL, keeping the hash', () => {
      expect(detectMediaSource('vimeo/76979871')).toEqual({
        kind: 'vimeo',
        src: 'https://vimeo.com/76979871',
        id: '76979871',
      });

      for (const shorthand of [
        'vimeo/76979871?hash=8272103f6e',
        'vimeo/76979871?h=8272103f6e',
        'vimeo/76979871/8272103f6e',
      ]) {
        expect(detectMediaSource(shorthand)?.src).toBe('https://vimeo.com/76979871?h=8272103f6e');
      }
    });
  });

  it('converts Mux player URLs into the stream URL Mux media plays', () => {
    expect(detectMediaSource('https://player.mux.com/a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M')).toEqual({
      kind: 'mux',
      src: 'https://stream.mux.com/a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M.m3u8',
      id: 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M',
    });
  });

  it.each([
    ['https://example.com/live/stream.m3u8', 'hls', 'application/x-mpegurl'],
    ['https://example.com/manifest.mpd?token=abc', 'dash', 'application/dash+xml'],
    ['/media/video.mp4', 'video', 'video/mp4'],
    ['clip.WEBM', 'video', 'video/webm'],
    ['https://cdn.example.com/podcast.mp3#t=30', 'audio', 'audio/mpeg'],
    ['https://stream.example.com/abc.m3u8', 'hls', 'application/x-mpegurl'],
  ])('detects %s by its file extension', (src, kind, type) => {
    expect(detectMediaSource(src)).toEqual({ kind, src, type });
  });

  it('prefers the MIME type over the file extension', () => {
    expect(detectMediaSource('https://example.com/manifest', 'application/vnd.apple.mpegurl')).toEqual({
      kind: 'hls',
      src: 'https://example.com/manifest',
      type: 'application/vnd.apple.mpegurl',
    });

    expect(detectMediaSource('blob:https://example.com/1234', 'video/mp4')?.kind).toBe('video');
    expect(detectMediaSource('https://example.com/stream', 'application/dash+xml')?.kind).toBe('dash');
    expect(detectMediaSource('https://example.com/episode', 'audio/mpeg')?.kind).toBe('audio');
  });

  it.each([
    ['an empty string', ''],
    ['a bare YouTube id', 'aqz-KE-bpKQ'],
    ['a bare Vimeo id', '76979871'],
    ['a bare Wistia id', 'e4a27b971d'],
    ['a bare Mux playback id', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M'],
    ['an unknown file type', 'https://example.com/file.bin'],
    ['a page without a video', 'https://www.youtube.com/'],
    ['a TikTok short link', 'https://vm.tiktok.com/ZMabc123/'],
    ['a Twitch clip', 'https://clips.twitch.tv/SomeClipSlug'],
    ['a provider URL nested in a query parameter', 'https://example.com/share?url=https://youtu.be/aqz-KE-bpKQ'],
  ])('returns null for %s', (_, src) => {
    expect(detectMediaSource(src)).toBe(null);
  });
});
