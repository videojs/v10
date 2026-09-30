import { isHlsJsAdapter } from '@videojs/hlsjs-video';
import { isHlsVideoAdapter } from '@videojs/spf/hls-video';
import { describe, expect, it } from 'vite-plus/test';

import { isMuxVideoAdapter, MuxVideoAdapter } from '../index';
import { isMuxVideoAdapter as isSpfMuxVideoAdapter, MuxVideoAdapter as SpfMuxVideoAdapter } from '../spf';

describe('isMuxVideoAdapter', () => {
  it('recognizes Mux video over hls.js, which is also hls.js media', () => {
    const media = new MuxVideoAdapter();

    expect(isMuxVideoAdapter(media)).toBe(true);
    expect(isHlsJsAdapter(media)).toBe(true);
    expect(isSpfMuxVideoAdapter(media)).toBe(false);

    media.destroy();
  });

  it('recognizes Mux video over SPF, which is also SPF HLS video', () => {
    const media = new SpfMuxVideoAdapter();

    expect(isSpfMuxVideoAdapter(media)).toBe(true);
    expect(isHlsVideoAdapter(media)).toBe(true);
    expect(isMuxVideoAdapter(media)).toBe(false);
    expect(isHlsJsAdapter(media)).toBe(false);

    media.destroy();
  });
});
