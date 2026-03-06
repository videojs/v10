import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaElement } from '../media-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<T extends HTMLElement>(ctor: abstract new () => T): T {
  const tag = uniqueTag('test-media');
  customElements.define(tag, class extends (ctor as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as T;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('MediaElement', () => {
  it('extends DestroyMixin(ReactiveElement)', () => {
    const el = createElement(MediaElement);
    expect(el).toBeInstanceOf(MediaElement);
    expect(el.destroyed).toBe(false);
  });
});
