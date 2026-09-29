import { isBrandedMedia } from '@videojs/media';
import { isMuxVideoMedia } from '@videojs/mux-video';
import { isHlsAudioMedia } from '@videojs/spf/hls-audio';
import { describe, expect, it } from 'vite-plus/test';

import { isMuxAudioMedia, MuxAudioAdapter } from '../index';
import { isMuxAudioMedia as isSpfMuxAudioMedia, MuxAudioAdapter as SpfMuxAudioAdapter } from '../spf';

describe('isMuxAudioMedia', () => {
  it('recognizes Mux audio over hls.js, which is hls.js media but not Mux video', () => {
    const media = new MuxAudioAdapter();

    expect(isMuxAudioMedia(media)).toBe(true);
    expect(isBrandedMedia(media, '@videojs/hlsjs-video')).toBe(true);
    expect(isMuxVideoMedia(media)).toBe(false);
    expect(isSpfMuxAudioMedia(media)).toBe(false);

    media.destroy();
  });

  it('recognizes Mux audio over SPF, which is also SPF HLS audio', () => {
    const media = new SpfMuxAudioAdapter();

    expect(isSpfMuxAudioMedia(media)).toBe(true);
    expect(isHlsAudioMedia(media)).toBe(true);
    expect(isMuxAudioMedia(media)).toBe(false);

    media.destroy();
  });
});
