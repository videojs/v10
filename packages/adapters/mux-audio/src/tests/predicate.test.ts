import { isBrandedMedia } from '@videojs/media';
import { isMuxVideoAdapter } from '@videojs/mux-video';
import { isHlsAudioAdapter } from '@videojs/spf/hls-audio';
import { describe, expect, it } from 'vite-plus/test';

import { isMuxAudioAdapter, MuxAudioAdapter } from '../index';
import { isMuxAudioAdapter as isSpfMuxAudioAdapter, MuxAudioAdapter as SpfMuxAudioAdapter } from '../spf';

describe('isMuxAudioAdapter', () => {
  it('recognizes Mux audio over hls.js, which is hls.js media but not Mux video', () => {
    const media = new MuxAudioAdapter();

    expect(isMuxAudioAdapter(media)).toBe(true);
    expect(isBrandedMedia(media, '@videojs/hlsjs-video')).toBe(true);
    expect(isMuxVideoAdapter(media)).toBe(false);
    expect(isSpfMuxAudioAdapter(media)).toBe(false);

    media.destroy();
  });

  it('recognizes Mux audio over SPF, which is also SPF HLS audio', () => {
    const media = new SpfMuxAudioAdapter();

    expect(isSpfMuxAudioAdapter(media)).toBe(true);
    expect(isHlsAudioAdapter(media)).toBe(true);
    expect(isMuxAudioAdapter(media)).toBe(false);

    media.destroy();
  });
});
