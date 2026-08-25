import { describe, expect, it } from 'vite-plus/test';

import { buildOptions } from '../renderer-options';

describe('buildOptions', () => {
  it('returns flat options in the configured order for default-video', () => {
    expect(buildOptions('default-video')).toEqual([
      { value: 'html5-video', label: 'HTML5 Video' },
      { value: 'hls', label: 'HLS' },
      { value: 'dash', label: 'DASH' },
      { value: 'mux-video', label: 'Mux' },
      { value: 'vimeo', label: 'Vimeo' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'cloudflare', label: 'Cloudflare Stream' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'twitch', label: 'Twitch' },
    ]);
  });

  it('returns flat options for default-audio', () => {
    expect(buildOptions('default-audio')).toEqual([
      { value: 'html5-audio', label: 'HTML5 Audio' },
      { value: 'mux-audio', label: 'Mux' },
      { value: 'spotify', label: 'Spotify' },
    ]);
  });

  it('offers only live-aware media for live-video', () => {
    expect(buildOptions('live-video')).toEqual([
      { value: 'hls', label: 'HLS' },
      { value: 'mux-video', label: 'Mux' },
    ]);
  });

  it('offers only Mux for live-audio', () => {
    expect(buildOptions('live-audio')).toEqual([{ value: 'mux-audio', label: 'Mux' }]);
  });
});
