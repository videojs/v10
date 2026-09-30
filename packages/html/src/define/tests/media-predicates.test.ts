/**
 * The media guards read a brand off the adapter, and a registered media element is not an adapter: it wraps one. These
 * check the guards each `@videojs/html/media/*` entry re-exports against the elements that entry registers.
 */
import { describe, expect, it } from 'vite-plus/test';

import { HlsBackgroundVideoElement, isHlsBackgroundVideoAdapter } from '../media/hls-background-video';
import { isHlsVideoAdapter } from '../media/hls-video';
import { isHlsJsAdapter } from '../media/hlsjs-video';
import {
  isHlsBackgroundVideoAdapter as isMuxBackgroundVideoAdapter,
  MuxBackgroundVideoElement,
} from '../media/mux-background-video';

describe('isHlsJsAdapter', () => {
  it('recognizes <hlsjs-video> and not other media elements', () => {
    expect(isHlsJsAdapter(document.createElement('hlsjs-video'))).toBe(true);
    expect(isHlsJsAdapter(document.createElement('hls-video'))).toBe(false);
    expect(isHlsJsAdapter(document.createElement('video'))).toBe(false);
  });
});

describe('isHlsVideoAdapter', () => {
  it('recognizes <hls-video> and not <hlsjs-video>', () => {
    expect(isHlsVideoAdapter(document.createElement('hls-video'))).toBe(true);
    expect(isHlsVideoAdapter(document.createElement('hlsjs-video'))).toBe(false);
  });
});

describe('isHlsBackgroundVideoAdapter', () => {
  // These elements keep their adapter private and register it, not themselves, as the player's media.
  it('recognizes the media both background video tags register, from either entry', () => {
    const hls = new HlsBackgroundVideoElement();
    const mux = new MuxBackgroundVideoElement();

    expect(isHlsBackgroundVideoAdapter(hls.getMediaTarget())).toBe(true);
    expect(isHlsBackgroundVideoAdapter(mux.getMediaTarget())).toBe(true);

    expect(isMuxBackgroundVideoAdapter).toBe(isHlsBackgroundVideoAdapter);
  });
});
