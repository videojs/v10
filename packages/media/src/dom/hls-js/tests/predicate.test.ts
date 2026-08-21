import { describe, expect, it } from 'vitest';
import { HlsJsMedia, isHlsJsMedia } from '..';

describe('isHlsJsMedia', () => {
  it('recognizes HlsJsMedia by its symbol marker', () => {
    const media = new HlsJsMedia();

    expect(isHlsJsMedia(media)).toBe(true);
    expect(isHlsJsMedia({})).toBe(false);
    expect(isHlsJsMedia(null)).toBe(false);

    media.destroy();
  });
});
