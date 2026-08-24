import { describe, expect, it } from 'vitest';
import { isYouTubeMedia, YouTubeMedia } from '..';

describe('isYouTubeMedia', () => {
  it('recognizes YouTubeMedia by its symbol marker', () => {
    const media = new YouTubeMedia();

    expect(isYouTubeMedia(media)).toBe(true);
    expect(isYouTubeMedia({})).toBe(false);
    expect(isYouTubeMedia(null)).toBe(false);

    media.destroy();
  });
});
