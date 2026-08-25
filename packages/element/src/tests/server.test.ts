// @vitest-environment node
import { describe, expect, it } from 'vite-plus/test';

describe('ReactiveElement server import', () => {
  it('imports without browser-only globals', async () => {
    const { ReactiveElement } = await import('../reactive-element');

    expect(ReactiveElement).toBeTypeOf('function');
  });
});
