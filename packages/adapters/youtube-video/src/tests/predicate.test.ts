import { describe, expect, it } from 'vite-plus/test';

import { YouTubeAdapter, isYouTubeAdapter } from '../index';

describe('isYouTubeAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new YouTubeAdapter();

    expect(isYouTubeAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isYouTubeAdapter(new EventTarget())).toBe(false);
    expect(isYouTubeAdapter({})).toBe(false);
    expect(isYouTubeAdapter(null)).toBe(false);
  });
});
