/**
 * The alias entry. Asserting identity rather than behavior is the point: if these are the same classes, the behavior
 * tests in `../../hls-background-video/tests` already cover this entry, and there is no second implementation to
 * drift.
 */
import { describe, expect, it } from 'vite-plus/test';

import {
  HlsBackgroundVideoMedia,
  HlsBackgroundVideoMediaElement,
  HlsBackgroundVideoMediaMixin,
  hlsBackgroundVideoMediaDefaultProps,
} from '../../hls-background-video';
import {
  MuxBackgroundVideoMedia,
  MuxBackgroundVideoMediaElement,
  MuxBackgroundVideoMediaMixin,
  muxBackgroundVideoMediaDefaultProps,
} from '../index';

describe('mux-background-video', () => {
  it('re-exports the hls-background-video Media unchanged', () => {
    expect(MuxBackgroundVideoMedia).toBe(HlsBackgroundVideoMedia);
  });

  it('re-exports the adapter, mixin, and defaults unchanged', () => {
    expect(MuxBackgroundVideoMediaElement).toBe(HlsBackgroundVideoMediaElement);
    expect(MuxBackgroundVideoMediaMixin).toBe(HlsBackgroundVideoMediaMixin);
    expect(muxBackgroundVideoMediaDefaultProps).toBe(hlsBackgroundVideoMediaDefaultProps);
  });
});
