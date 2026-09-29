import { describe, expect, it } from 'vite-plus/test';

import { VimeoAdapter, isVimeoMedia } from '../index';

describe('isVimeoMedia', () => {
  it('recognizes the adapter', () => {
    const media = new VimeoAdapter();

    expect(isVimeoMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isVimeoMedia(new EventTarget())).toBe(false);
    expect(isVimeoMedia({})).toBe(false);
    expect(isVimeoMedia(null)).toBe(false);
  });
});
