// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';

describe('MediaIconElement server import', () => {
  it('imports without browser-only globals', async () => {
    const { MediaIconElement } = await import('../element');

    expect(MediaIconElement).toBeTypeOf('function');
  });
});
