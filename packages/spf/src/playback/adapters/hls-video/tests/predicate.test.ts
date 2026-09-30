import { describe, expect, it } from 'vite-plus/test';

import { HlsVideoAdapter, isHlsVideoAdapter } from '../index';

describe('isHlsVideoAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new HlsVideoAdapter();

    expect(isHlsVideoAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isHlsVideoAdapter(new EventTarget())).toBe(false);
    expect(isHlsVideoAdapter({})).toBe(false);
    expect(isHlsVideoAdapter(null)).toBe(false);
  });
});
