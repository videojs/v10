import { describe, expect, it } from 'vite-plus/test';

import { TwitchAdapter, isTwitchMedia } from '../index';

describe('isTwitchMedia', () => {
  it('recognizes the adapter', () => {
    const media = new TwitchAdapter();

    expect(isTwitchMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isTwitchMedia(new EventTarget())).toBe(false);
    expect(isTwitchMedia({})).toBe(false);
    expect(isTwitchMedia(null)).toBe(false);
  });
});
