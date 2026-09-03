// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';

// The real `shaka-player` module, not the mock the other suites install:
// evaluating it is exactly what a server runtime trips over without the shim.
describe('ShakaAdapter', () => {
  it('imports without browser globals and leaves none behind', async () => {
    const { ShakaAdapter } = await import('../index');

    expect(typeof self).toBe('undefined');
    expect(ShakaAdapter).toBeTypeOf('function');
  });

  it('constructs inert on a server runtime', async () => {
    const { ShakaAdapter } = await import('../index');

    const media = new ShakaAdapter();

    expect(media.engine).toBeNull();
    expect(() => media.destroy()).not.toThrow();
  });
});
