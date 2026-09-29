import { describe, expect, it } from 'vite-plus/test';

import { ShakaAdapter, isShakaMedia } from '../index';

describe('isShakaMedia', () => {
  it('recognizes the adapter', () => {
    const media = new ShakaAdapter();

    expect(isShakaMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isShakaMedia(new EventTarget())).toBe(false);
    expect(isShakaMedia({})).toBe(false);
    expect(isShakaMedia(null)).toBe(false);
  });
});
