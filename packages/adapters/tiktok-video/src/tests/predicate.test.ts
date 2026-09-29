import { describe, expect, it } from 'vite-plus/test';

import { TikTokAdapter, isTikTokMedia } from '../index';

describe('isTikTokMedia', () => {
  it('recognizes the adapter', () => {
    const media = new TikTokAdapter();

    expect(isTikTokMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isTikTokMedia(new EventTarget())).toBe(false);
    expect(isTikTokMedia({})).toBe(false);
    expect(isTikTokMedia(null)).toBe(false);
  });
});
