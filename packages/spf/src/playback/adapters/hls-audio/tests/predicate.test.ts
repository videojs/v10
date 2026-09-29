import { describe, expect, it } from 'vite-plus/test';

import { HlsAudioAdapter, isHlsAudioMedia } from '../index';

describe('isHlsAudioMedia', () => {
  it('recognizes the adapter', () => {
    const media = new HlsAudioAdapter();

    expect(isHlsAudioMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isHlsAudioMedia(new EventTarget())).toBe(false);
    expect(isHlsAudioMedia({})).toBe(false);
    expect(isHlsAudioMedia(null)).toBe(false);
  });
});
