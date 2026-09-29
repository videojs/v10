import { describe, expect, it } from 'vite-plus/test';

import { YouTubeAdapter, isYouTubeMedia } from '../index';

describe('isYouTubeMedia', () => {
  it('recognizes the adapter', () => {
    const media = new YouTubeAdapter();

    expect(isYouTubeMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isYouTubeMedia(new EventTarget())).toBe(false);
    expect(isYouTubeMedia({})).toBe(false);
    expect(isYouTubeMedia(null)).toBe(false);
  });
});
