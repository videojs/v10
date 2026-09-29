import { describe, expect, it } from 'vite-plus/test';

import { HlsBackgroundVideoAdapter, isHlsBackgroundVideoMedia } from '../index';

describe('isHlsBackgroundVideoMedia', () => {
  it('recognizes the adapter', () => {
    const media = new HlsBackgroundVideoAdapter();

    expect(isHlsBackgroundVideoMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isHlsBackgroundVideoMedia(new EventTarget())).toBe(false);
    expect(isHlsBackgroundVideoMedia({})).toBe(false);
    expect(isHlsBackgroundVideoMedia(null)).toBe(false);
  });
});
