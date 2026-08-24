import { registerI18n } from '@videojs/core/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaI18nProviderElement } from '../../../i18n/provider-element';
import { ContainerElement } from '../container-element';

let tagCounter = 0;

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = `test-media-container-${tagCounter++}`;
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ContainerElement', () => {
  it('provides default focus and accessibility attributes', () => {
    const container = createElement(ContainerElement);

    document.body.append(container);

    expect(container.getAttribute('tabindex')).toBe('0');
    expect(container.getAttribute('role')).toBe('group');
    expect(container.getAttribute('aria-label')).toBe('Media player');
  });

  it('preserves explicit role and aria-label', () => {
    const container = createElement(ContainerElement);
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Video player');

    document.body.append(container);

    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Video player');
  });

  it('uses aria-labelledby instead of the default label when provided', () => {
    const container = createElement(ContainerElement);
    container.setAttribute('aria-labelledby', 'player-title');

    document.body.append(container);

    expect(container.getAttribute('aria-labelledby')).toBe('player-title');
    expect(container.hasAttribute('aria-label')).toBe(false);
  });

  it('translates the default accessible name', async () => {
    if (!customElements.get(MediaI18nProviderElement.tagName)) {
      customElements.define(MediaI18nProviderElement.tagName, MediaI18nProviderElement);
    }
    registerI18n('x-container', { container: { label: 'Translated media player' } });
    const provider = document.createElement(MediaI18nProviderElement.tagName) as MediaI18nProviderElement;
    const container = createElement(ContainerElement);
    provider.lang = 'x-container';
    provider.append(container);
    document.body.append(provider);

    await vi.waitFor(() => expect(container.getAttribute('aria-label')).toBe('Translated media player'));
  });
});
