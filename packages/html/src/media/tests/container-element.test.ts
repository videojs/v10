import { afterEach, describe, expect, it } from 'vitest';

import { MediaContainerElement } from '../container-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-media-container');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('MediaContainerElement', () => {
  it('provides default focus and accessibility attributes', () => {
    const container = createElement(MediaContainerElement);

    document.body.append(container);

    expect(container.getAttribute('tabindex')).toBe('0');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Media player');
  });

  it('preserves explicit role and aria-label', () => {
    const container = createElement(MediaContainerElement);
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Video player');

    document.body.append(container);

    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Video player');
  });

  it('uses aria-labelledby instead of the default label when provided', () => {
    const container = createElement(MediaContainerElement);
    container.setAttribute('aria-labelledby', 'player-title');

    document.body.append(container);

    expect(container.getAttribute('aria-labelledby')).toBe('player-title');
    expect(container.hasAttribute('aria-label')).toBe(false);
  });
});
