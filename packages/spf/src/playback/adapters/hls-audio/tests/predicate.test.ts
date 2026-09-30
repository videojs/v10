import { describe, expect, it } from 'vite-plus/test';

import { HlsAudioAdapter, isHlsAudioAdapter } from '../index';

describe('isHlsAudioAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new HlsAudioAdapter();

    expect(isHlsAudioAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isHlsAudioAdapter(new EventTarget())).toBe(false);
    expect(isHlsAudioAdapter({})).toBe(false);
    expect(isHlsAudioAdapter(null)).toBe(false);
  });
});
