import { describe, expect, it } from 'vite-plus/test';

import { SpotifyAdapter, isSpotifyAdapter } from '../index';

describe('isSpotifyAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new SpotifyAdapter();

    expect(isSpotifyAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isSpotifyAdapter(new EventTarget())).toBe(false);
    expect(isSpotifyAdapter({})).toBe(false);
    expect(isSpotifyAdapter(null)).toBe(false);
  });
});
