import { describe, expect, it } from 'vite-plus/test';

import { NativeHlsAdapter, isNativeHlsAdapter } from '../index';

describe('isNativeHlsAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new NativeHlsAdapter();

    expect(isNativeHlsAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isNativeHlsAdapter(new EventTarget())).toBe(false);
    expect(isNativeHlsAdapter({})).toBe(false);
    expect(isNativeHlsAdapter(null)).toBe(false);
  });
});
