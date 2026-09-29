import { describe, expect, it } from 'vite-plus/test';

import { DashAdapter, isDashMedia } from '../index';

describe('isDashMedia', () => {
  it('recognizes the adapter', () => {
    // Not destroyed: dash.js throws when a player that never attached is reset.
    expect(isDashMedia(new DashAdapter())).toBe(true);
  });

  it('rejects other values', () => {
    expect(isDashMedia(new EventTarget())).toBe(false);
    expect(isDashMedia({})).toBe(false);
    expect(isDashMedia(null)).toBe(false);
  });
});
