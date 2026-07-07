import { describe, expect, it } from 'vitest';
import { generateCdnCode, rendererSupportsCdn } from '../cdn-code';

describe('generateCdnCode', () => {
  // Media subpaths that ship a CDN build. The media script is emitted only for
  // renderers whose subpath is in this set.
  const manifest = ['hlsjs-video', 'dash-video', 'mux-video', 'mux-audio'];

  it('generates video preset CDN tags for html5-video', () => {
    expect(generateCdnCode('default-video', 'video', 'html5-video', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>`
    );
  });

  it('includes hls media bundle when renderer is hls', () => {
    expect(generateCdnCode('default-video', 'minimal-video', 'hls', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video-minimal.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/hlsjs-video.js"></script>`
    );
  });

  it('includes the dash media bundle when renderer is dash', () => {
    expect(generateCdnCode('default-video', 'video', 'dash', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/dash-video.js"></script>`
    );
  });

  it('includes the mux media bundle when renderer is mux-video', () => {
    expect(generateCdnCode('default-video', 'video', 'mux-video', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/mux-video.js"></script>`
    );
  });

  it('omits the media script for a media renderer absent from the manifest', () => {
    expect(generateCdnCode('default-video', 'video', 'vimeo', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>`
    );
  });

  it('generates background preset CDN tags', () => {
    expect(generateCdnCode('background-video', 'video', 'background-video', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/background.js"></script>`
    );
  });

  it('generates headless video CDN tag when skin is none', () => {
    expect(generateCdnCode('default-video', 'none', 'html5-video', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video-headless.js"></script>`
    );
  });

  it('generates headless audio CDN tag when skin is none', () => {
    expect(generateCdnCode('default-audio', 'none', 'html5-audio', manifest)).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/audio-headless.js"></script>`
    );
  });
});

describe('rendererSupportsCdn', () => {
  // Mirrors the manifest entries that ship a CDN build.
  const manifest = ['hlsjs-video', 'dash-video', 'mux-video', 'mux-audio'];

  it('returns true for preset renderers (covered by the preset bundle, no media subpath)', () => {
    expect(rendererSupportsCdn('html5-video', manifest)).toBe(true);
    expect(rendererSupportsCdn('html5-audio', manifest)).toBe(true);
    expect(rendererSupportsCdn('background-video', manifest)).toBe(true);
  });

  it('returns true for media renderers whose subpath is in the manifest', () => {
    expect(rendererSupportsCdn('hls', manifest)).toBe(true);
    expect(rendererSupportsCdn('dash', manifest)).toBe(true);
    expect(rendererSupportsCdn('mux-video', manifest)).toBe(true);
    expect(rendererSupportsCdn('mux-audio', manifest)).toBe(true);
  });

  it('returns false for vimeo, which has no CDN build', () => {
    expect(rendererSupportsCdn('vimeo', manifest)).toBe(false);
  });
});
