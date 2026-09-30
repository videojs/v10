import { describe, expect, it } from 'vite-plus/test';

import { DashAdapter, isDashAdapter } from '../index';

describe('isDashAdapter', () => {
  it('recognizes the adapter', () => {
    // Not destroyed: dash.js throws when a player that never attached is reset.
    expect(isDashAdapter(new DashAdapter())).toBe(true);
  });

  it('rejects other values', () => {
    expect(isDashAdapter(new EventTarget())).toBe(false);
    expect(isDashAdapter({})).toBe(false);
    expect(isDashAdapter(null)).toBe(false);
  });
});
