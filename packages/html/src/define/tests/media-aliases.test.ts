/**
 * Tags that are two names for one element rather than two elements.
 *
 * The thing worth asserting is that both register: a custom-element class can hold one tag name, so an alias has to be
 * a subclass of the shared base, not a re-export of it. Importing both entries in one realm is a supported
 * configuration — unlike the flavor tags in `define/media/mux-video`, where two engines compete for one name.
 */
import { describe, expect, it } from 'vite-plus/test';

import { HlsBackgroundVideo } from '../../media/hls-background-video';
import { HlsBackgroundVideoElement } from '../media/hls-background-video';
import { MuxBackgroundVideoElement } from '../media/mux-background-video';

describe('background-video alias tags', () => {
  it('registers both tags', () => {
    expect(customElements.get('hls-background-video')).toBe(HlsBackgroundVideoElement);
    expect(customElements.get('mux-background-video')).toBe(MuxBackgroundVideoElement);
  });

  it('registers distinct subclasses of the one shared base', () => {
    expect(MuxBackgroundVideoElement).not.toBe(HlsBackgroundVideoElement);
    expect(Object.getPrototypeOf(HlsBackgroundVideoElement)).toBe(HlsBackgroundVideo);
    expect(Object.getPrototypeOf(MuxBackgroundVideoElement)).toBe(HlsBackgroundVideo);
  });
});
