import { describe, expect, it } from 'vite-plus/test';

import { CloudflareAdapter, isCloudflareAdapter } from '../index';

describe('isCloudflareAdapter', () => {
  it('recognizes the adapter', () => {
    const media = new CloudflareAdapter();

    expect(isCloudflareAdapter(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isCloudflareAdapter(new EventTarget())).toBe(false);
    expect(isCloudflareAdapter({})).toBe(false);
    expect(isCloudflareAdapter(null)).toBe(false);
  });
});
