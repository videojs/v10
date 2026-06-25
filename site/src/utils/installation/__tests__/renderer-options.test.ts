import { describe, expect, it } from 'vitest';
import { buildGroups, buildOptions } from '../renderer-options';

describe('buildOptions', () => {
  it('returns flat options in the configured order for default-video', () => {
    expect(buildOptions('default-video')).toEqual([
      { value: 'html5-video', label: 'HTML5 Video' },
      { value: 'hls', label: 'HLS' },
      { value: 'dash', label: 'DASH' },
      { value: 'mux-video', label: 'Mux' },
      { value: 'vimeo', label: 'Vimeo' },
    ]);
  });
});

describe('buildGroups', () => {
  it('groups default-video into Files / Streaming formats / Hosting services', () => {
    expect(buildGroups('default-video')).toEqual([
      { label: 'Files', options: [{ value: 'html5-video', label: 'HTML5 Video' }] },
      {
        label: 'Streaming formats',
        options: [
          { value: 'hls', label: 'HLS' },
          { value: 'dash', label: 'DASH' },
        ],
      },
      {
        label: 'Hosting services',
        options: [
          { value: 'mux-video', label: 'Mux' },
          { value: 'vimeo', label: 'Vimeo' },
        ],
      },
    ]);
  });

  it('returns null for default-audio (all sections would be single-item)', () => {
    expect(buildGroups('default-audio')).toBeNull();
  });

  it('returns null for background-video (single renderer)', () => {
    expect(buildGroups('background-video')).toBeNull();
  });
});
