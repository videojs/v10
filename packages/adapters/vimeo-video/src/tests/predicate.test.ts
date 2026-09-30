import { describe, expect, it } from 'vite-plus/test';

import { VimeoAdapter, isVimeoAdapter } from '../index';

describe('isVimeoAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new VimeoAdapter();

    expect(isVimeoAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isVimeoAdapter(new EventTarget())).toBe(false);
    expect(isVimeoAdapter({})).toBe(false);
    expect(isVimeoAdapter(null)).toBe(false);
  });
});
