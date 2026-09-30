import { describe, expect, it, vi } from 'vite-plus/test';

import { isWistiaAdapter, WistiaAdapter } from '../index';

vi.mock('@wistia/wistia-player', () => ({
  WistiaPlayer: class extends HTMLElement {
    static observedAttributes: string[] = [];
  },
}));

customElements.define('test-predicate-wistia-video', class extends WistiaAdapter {});

describe('isWistiaAdapter', () => {
  it('recognizes an element built on the adapter', () => {
    expect(isWistiaAdapter(document.createElement('test-predicate-wistia-video'))).toBe(true);
  });

  it('rejects other values', () => {
    expect(isWistiaAdapter(document.createElement('video'))).toBe(false);
    expect(isWistiaAdapter(null)).toBe(false);
  });
});
