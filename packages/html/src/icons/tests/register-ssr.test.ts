// @vitest-environment node

import { describe, expect, it } from 'vite-plus/test';

import { registerIcons } from '..';

describe('registerIcons SSR', () => {
  it('stores exact registrations without browser globals', () => {
    expect(() => registerIcons('test-ssr-icons', { play: '<svg></svg>' })).not.toThrow();
  });
});
