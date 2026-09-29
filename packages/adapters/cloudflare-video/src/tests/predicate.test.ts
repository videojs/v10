import { describe, expect, it } from 'vite-plus/test';

import { CloudflareAdapter, isCloudflareMedia } from '../index';

describe('isCloudflareMedia', () => {
  it('recognizes the adapter', () => {
    const media = new CloudflareAdapter();

    expect(isCloudflareMedia(media)).toBe(true);

    media.destroy();
  });

  it('rejects other values', () => {
    expect(isCloudflareMedia(new EventTarget())).toBe(false);
    expect(isCloudflareMedia({})).toBe(false);
    expect(isCloudflareMedia(null)).toBe(false);
  });
});
