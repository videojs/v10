import { describe, expect, it, vi } from 'vite-plus/test';

import { isWistiaMedia, WistiaAdapter } from '../index';

vi.mock('@wistia/wistia-player', () => ({
  WistiaPlayer: class extends HTMLElement {
    static observedAttributes: string[] = [];
  },
}));

customElements.define('test-predicate-wistia-video', class extends WistiaAdapter {});

describe('isWistiaMedia', () => {
  it('recognizes an element built on the adapter', () => {
    expect(isWistiaMedia(document.createElement('test-predicate-wistia-video'))).toBe(true);
  });

  it('rejects other values', () => {
    expect(isWistiaMedia(document.createElement('video'))).toBe(false);
    expect(isWistiaMedia(null)).toBe(false);
  });
});
