import { describe, expect, it } from 'vite-plus/test';

import { TwitchAdapter, isTwitchAdapter } from '../index';

describe('isTwitchAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new TwitchAdapter();

    expect(isTwitchAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isTwitchAdapter(new EventTarget())).toBe(false);
    expect(isTwitchAdapter({})).toBe(false);
    expect(isTwitchAdapter(null)).toBe(false);
  });
});
