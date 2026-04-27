import { afterEach, describe, expect, it, vi } from 'vitest';

describe('SSR-safe define imports', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('imports video skin without browser-only globals', async () => {
    vi.stubGlobal('customElements', undefined);
    vi.stubGlobal('CSSStyleSheet', undefined);

    await expect(import('../video/skin')).resolves.toBeDefined();
  });

  it('imports simple-hls-video without customElements', async () => {
    vi.stubGlobal('customElements', undefined);

    await expect(import('../media/simple-hls-video')).resolves.toBeDefined();
  });
});
