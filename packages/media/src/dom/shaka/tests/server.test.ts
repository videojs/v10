// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';

// The real `shaka-player` module, not the mock the other suites install:
// evaluating it is exactly what a server runtime trips over without the shim.
describe('ShakaMedia', () => {
  it('imports without browser globals and leaves none behind', async () => {
    const { ShakaMedia } = await import('../index');

    expect(typeof self).toBe('undefined');
    expect(ShakaMedia).toBeTypeOf('function');
  });

  it('constructs inert on a server runtime', async () => {
    const { ShakaMedia } = await import('../index');

    const media = new ShakaMedia();

    expect(media.engine).toBeNull();
    expect(() => media.destroy()).not.toThrow();
  });
});
