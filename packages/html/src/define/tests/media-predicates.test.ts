/**
 * The media guards read a brand off the adapter, and a registered media element is not an adapter: it wraps one. These
 * check the guards each `@videojs/html/media/*` entry re-exports against the elements that entry registers.
 */
import { describe, expect, it } from 'vite-plus/test';

import { HlsBackgroundVideoElement, isHlsBackgroundVideoMedia } from '../media/hls-background-video';
import { isHlsVideoMedia } from '../media/hls-video';
import { isHlsJsMedia } from '../media/hlsjs-video';
import {
  isHlsBackgroundVideoMedia as isMuxBackgroundVideoMedia,
  MuxBackgroundVideoElement,
} from '../media/mux-background-video';

describe('isHlsJsMedia', () => {
  it('recognizes <hlsjs-video> and not other media elements', () => {
    expect(isHlsJsMedia(document.createElement('hlsjs-video'))).toBe(true);
    expect(isHlsJsMedia(document.createElement('hls-video'))).toBe(false);
    expect(isHlsJsMedia(document.createElement('video'))).toBe(false);
  });
});

describe('isHlsVideoMedia', () => {
  it('recognizes <hls-video> and not <hlsjs-video>', () => {
    expect(isHlsVideoMedia(document.createElement('hls-video'))).toBe(true);
    expect(isHlsVideoMedia(document.createElement('hlsjs-video'))).toBe(false);
  });
});

describe('isHlsBackgroundVideoMedia', () => {
  // These elements keep their adapter private and register it, not themselves, as the player's media.
  it('recognizes the media both background video tags register, from either entry', () => {
    const hls = new HlsBackgroundVideoElement();
    const mux = new MuxBackgroundVideoElement();

    expect(isHlsBackgroundVideoMedia(hls.getMediaTarget())).toBe(true);
    expect(isHlsBackgroundVideoMedia(mux.getMediaTarget())).toBe(true);

    expect(isMuxBackgroundVideoMedia).toBe(isHlsBackgroundVideoMedia);
  });
});
