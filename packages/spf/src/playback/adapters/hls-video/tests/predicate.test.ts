import { describe, expect, it } from 'vite-plus/test';

import { HlsVideoAdapter, isHlsVideoMedia } from '../index';

describe('isHlsVideoMedia', () => {
  it('recognizes the adapter', () => {
    const media = new HlsVideoAdapter();

    expect(isHlsVideoMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isHlsVideoMedia(new EventTarget())).toBe(false);
    expect(isHlsVideoMedia({})).toBe(false);
    expect(isHlsVideoMedia(null)).toBe(false);
  });
});
