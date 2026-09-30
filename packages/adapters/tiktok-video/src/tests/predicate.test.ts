import { describe, expect, it } from 'vite-plus/test';

import { TikTokAdapter, isTikTokAdapter } from '../index';

describe('isTikTokAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new TikTokAdapter();

    expect(isTikTokAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isTikTokAdapter(new EventTarget())).toBe(false);
    expect(isTikTokAdapter({})).toBe(false);
    expect(isTikTokAdapter(null)).toBe(false);
  });
});
