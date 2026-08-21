import { describe, expect, it } from 'vitest';
import { HlsVideoMedia, isHlsVideoMedia } from '..';

describe('isHlsVideoMedia', () => {
  it('recognizes HlsVideoMedia by its symbol marker', () => {
    const media = new HlsVideoMedia();

    expect(isHlsVideoMedia(media)).toBe(true);
    expect(isHlsVideoMedia({})).toBe(false);
    expect(isHlsVideoMedia(null)).toBe(false);

    media.destroy();
  });
});
