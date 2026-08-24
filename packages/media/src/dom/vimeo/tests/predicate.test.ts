import { describe, expect, it } from 'vitest';
import { isVimeoMedia, VimeoMedia } from '..';

describe('isVimeoMedia', () => {
  it('recognizes VimeoMedia by its symbol marker', () => {
    const media = new VimeoMedia();

    expect(isVimeoMedia(media)).toBe(true);
    expect(isVimeoMedia({})).toBe(false);
    expect(isVimeoMedia(null)).toBe(false);

    media.destroy();
  });
});
