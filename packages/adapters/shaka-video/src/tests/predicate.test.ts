import { describe, expect, it } from 'vite-plus/test';

import { ShakaAdapter, isShakaAdapter } from '../index';

describe('isShakaAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new ShakaAdapter();

    expect(isShakaAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isShakaAdapter(new EventTarget())).toBe(false);
    expect(isShakaAdapter({})).toBe(false);
    expect(isShakaAdapter(null)).toBe(false);
  });
});
