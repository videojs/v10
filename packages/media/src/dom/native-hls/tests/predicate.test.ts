import { describe, expect, it } from 'vitest';
import { isNativeHlsMedia, NativeHlsMedia } from '..';

describe('isNativeHlsMedia', () => {
  it('recognizes NativeHlsMedia by its symbol marker', () => {
    const media = new NativeHlsMedia();

    expect(isNativeHlsMedia(media)).toBe(true);
    expect(isNativeHlsMedia({})).toBe(false);
    expect(isNativeHlsMedia(null)).toBe(false);

    media.destroy();
  });
});
