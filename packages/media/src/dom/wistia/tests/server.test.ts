// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';

// `../index` reaches `@wistia/wistia-player`, and evaluating that is exactly what a server runtime trips
// over: it reads `location`, measures the `screen`, and calls `customElements.define` on its way through.
// Nothing here imports it, which is the whole point of the module under test.
describe('WistiaMedia', () => {
  it('imports without browser globals and leaves none behind', async () => {
    const { WistiaMedia } = await import('../server');

    expect(['window', 'location', 'screen', 'document', 'customElements'].filter((n) => n in globalThis)).toEqual([]);
    expect(WistiaMedia).toBeTypeOf('function');
  });

  it('subclasses inert, which is what a platform package does with it as it loads', async () => {
    const { WistiaMedia } = await import('../server');

    class WistiaVideo extends WistiaMedia {}
    const media = new WistiaVideo();

    expect(media.src).toBe('');
    expect(media.source).toBeNull();
  });

  it('stands in for the browser entry, so a server import finds the exports it would', async () => {
    const [server, ...shared] = await Promise.all([
      import('../server'),
      import('../normalize'),
      import('../options'),
      import('../props'),
      import('../source'),
    ]);

    // The tag React renders, which `media.ts` declares for the browser and this module has to match, or a
    // server render writes an element the client never hydrates.
    expect(server.WISTIA_PLAYER_TAG).toBe('wistia-player');

    for (const name of shared.flatMap((module) => Object.keys(module))) {
      expect(server).toHaveProperty(name);
    }
  });
});
