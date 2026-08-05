import { describe, expect, it } from 'vitest';
import { cdnUnsupportedReason, supportsCdnInstall } from '../prompts.js';

// Mirrors the install page's CDN gating: the preset/skin needs a published CDN
// bundle and, for media renderers, so does the media bundle.
describe('supportsCdnInstall', () => {
  it('returns true for preset renderers', () => {
    expect(supportsCdnInstall('default-video', 'video', 'html5-video')).toBe(true);
    expect(supportsCdnInstall('default-audio', 'audio', 'html5-audio')).toBe(true);
    expect(supportsCdnInstall('background-video', 'video', 'background-video')).toBe(true);
  });

  it('returns true for media renderers with a CDN build', () => {
    expect(supportsCdnInstall('default-video', 'video', 'hls')).toBe(true);
    expect(supportsCdnInstall('default-video', 'video', 'dash')).toBe(true);
    expect(supportsCdnInstall('default-video', 'video', 'mux-video')).toBe(true);
    expect(supportsCdnInstall('default-audio', 'audio', 'mux-audio')).toBe(true);
  });

  it('returns false for vimeo, which has no CDN build', () => {
    expect(supportsCdnInstall('default-video', 'video', 'vimeo')).toBe(false);
  });

  it('returns true for every live preset and skin variant', () => {
    expect(supportsCdnInstall('live-video', 'video', 'hls')).toBe(true);
    expect(supportsCdnInstall('live-video', 'minimal-video', 'mux-video')).toBe(true);
    expect(supportsCdnInstall('live-video', 'none', 'hls')).toBe(true);
    expect(supportsCdnInstall('live-audio', 'audio', 'mux-audio')).toBe(true);
    expect(supportsCdnInstall('live-audio', 'minimal-audio', 'mux-audio')).toBe(true);
    expect(supportsCdnInstall('live-audio', 'none', 'mux-audio')).toBe(true);
  });

  it('still returns false when the media has no CDN build, whatever the preset', () => {
    expect(supportsCdnInstall('live-video', 'video', 'vimeo')).toBe(false);
  });
});

describe('cdnUnsupportedReason', () => {
  it('returns null when the whole configuration ships a CDN build', () => {
    expect(cdnUnsupportedReason('live-video', 'video', 'hls')).toBeNull();
    expect(cdnUnsupportedReason('live-audio', 'none', 'mux-audio')).toBeNull();
  });

  it('blames the renderer when the preset ships but the media does not', () => {
    expect(cdnUnsupportedReason('default-video', 'video', 'vimeo')).toBe('renderer');
    expect(cdnUnsupportedReason('live-video', 'minimal-video', 'vimeo')).toBe('renderer');
  });
});
