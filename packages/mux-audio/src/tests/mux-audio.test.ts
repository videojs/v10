import { MuxMedia } from '@videojs/mux-video';
import { describe, expect, it } from 'vite-plus/test';

import { MuxAudioMedia } from '..';

describe('MuxAudioMedia', () => {
  it('is the hls.js-backed Mux Media, playable through an <audio> element', () => {
    const media = new MuxAudioMedia();

    expect(media).toBeInstanceOf(MuxMedia);
    expect(media.src).toBe('');
    expect(media.source).toBeNull();
  });
});
