import { isHlsJsMedia } from '@videojs/hlsjs-video';
import { isHlsVideoMedia } from '@videojs/spf/hls-video';
import { describe, expect, it } from 'vite-plus/test';

import { isMuxVideoMedia, MuxVideoAdapter } from '../index';
import { isMuxVideoMedia as isSpfMuxVideoMedia, MuxVideoAdapter as SpfMuxVideoAdapter } from '../spf';

describe('isMuxVideoMedia', () => {
  it('recognizes Mux video over hls.js, which is also hls.js media', () => {
    const media = new MuxVideoAdapter();

    expect(isMuxVideoMedia(media)).toBe(true);
    expect(isHlsJsMedia(media)).toBe(true);
    expect(isSpfMuxVideoMedia(media)).toBe(false);

    media.destroy();
  });

  it('recognizes Mux video over SPF, which is also SPF HLS video', () => {
    const media = new SpfMuxVideoAdapter();

    expect(isSpfMuxVideoMedia(media)).toBe(true);
    expect(isHlsVideoMedia(media)).toBe(true);
    expect(isMuxVideoMedia(media)).toBe(false);
    expect(isHlsJsMedia(media)).toBe(false);

    media.destroy();
  });
});
