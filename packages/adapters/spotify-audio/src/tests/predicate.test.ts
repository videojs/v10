import { describe, expect, it } from 'vite-plus/test';

import { SpotifyAdapter, isSpotifyMedia } from '../index';

describe('isSpotifyMedia', () => {
  it('recognizes the adapter', () => {
    const media = new SpotifyAdapter();

    expect(isSpotifyMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isSpotifyMedia(new EventTarget())).toBe(false);
    expect(isSpotifyMedia({})).toBe(false);
    expect(isSpotifyMedia(null)).toBe(false);
  });
});
