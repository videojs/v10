import type { AnyPlayerStore } from '@videojs/core/dom';
import { registerI18n } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import type { MediaControlsState } from '@videojs/media';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MediaI18nProviderElement } from '../../../i18n/provider-element';
import { playerContext } from '../../../player/context';
import { UIElement } from '../../ui-element';
import { ContainerElement } from '../container-element';

let tagCounter = 0;

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = `test-media-container-${tagCounter++}`;

  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function createControlsStore(): AnyPlayerStore {
  return createStore<unknown>()<MediaControlsState>({
    name: 'controls',
    state: ({ get, set }) => ({
      userActive: true,
      controlsVisible: true,
      requestControlsLock: () => () => {},
      toggleControls() {
        const visible = !(get().controlsVisible as boolean);

        set({ userActive: visible, controlsVisible: visible });
        return visible;
      },
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends UIElement {
  readonly store = createControlsStore();
  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }

  setControlsVisible(visible: boolean): void {
    const state = this.store.state as MediaControlsState;
    if (state.controlsVisible === visible) return;

    state.toggleControls();
    flush();
  }
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

  it('reflects controls visibility on the container', async () => {
    const provider = createElement(TestPlayerProviderElement);
    const container = createElement(ContainerElement);

    provider.append(container);
    document.body.append(provider);

    await vi.waitFor(() => expect(container.getAttribute('data-controls-visible')).toBe(''));

    provider.setControlsVisible(false);

    await vi.waitFor(() => expect(container.hasAttribute('data-controls-visible')).toBe(false));
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
