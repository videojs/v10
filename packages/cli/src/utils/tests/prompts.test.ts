import { describe, expect, it } from 'vitest';
import { supportsCdnInstall } from '../prompts.js';

// Mirrors the install page's CDN gating: preset renderers and media renderers
// whose bundle ships a CDN build support CDN; Vimeo (no CDN build) does not.
describe('supportsCdnInstall', () => {
  it('returns true for preset renderers', () => {
    expect(supportsCdnInstall('html5-video')).toBe(true);
    expect(supportsCdnInstall('html5-audio')).toBe(true);
    expect(supportsCdnInstall('background-video')).toBe(true);
  });

  it('returns true for media renderers with a CDN build', () => {
    expect(supportsCdnInstall('hls')).toBe(true);
    expect(supportsCdnInstall('dash')).toBe(true);
    expect(supportsCdnInstall('mux-video')).toBe(true);
    expect(supportsCdnInstall('mux-audio')).toBe(true);
  });

  it('returns false for vimeo, which has no CDN build', () => {
    expect(supportsCdnInstall('vimeo')).toBe(false);
  });
});
