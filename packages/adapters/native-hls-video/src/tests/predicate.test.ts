import { describe, expect, it } from 'vite-plus/test';

import { NativeHlsAdapter, isNativeHlsMedia } from '../index';

describe('isNativeHlsMedia', () => {
  it('recognizes the adapter', () => {
    const media = new NativeHlsAdapter();

    expect(isNativeHlsMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isNativeHlsMedia(new EventTarget())).toBe(false);
    expect(isNativeHlsMedia({})).toBe(false);
    expect(isNativeHlsMedia(null)).toBe(false);
  });
});
