import { describe, expect, it } from 'vite-plus/test';

import { HlsBackgroundVideoAdapter, isHlsBackgroundVideoAdapter } from '../index';

describe('isHlsBackgroundVideoAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new HlsBackgroundVideoAdapter();

    expect(isHlsBackgroundVideoAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isHlsBackgroundVideoAdapter(new EventTarget())).toBe(false);
    expect(isHlsBackgroundVideoAdapter({})).toBe(false);
    expect(isHlsBackgroundVideoAdapter(null)).toBe(false);
  });
});
