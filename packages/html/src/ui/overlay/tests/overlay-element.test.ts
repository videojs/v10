import type { MediaControlsState, MediaError, MediaErrorState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { OverlayElement } from '../overlay-element';

interface OverlayTestState extends MediaControlsState, MediaErrorState {
  setControlsVisible(visible: boolean): void;
  setError(error: MediaError | null): void;
}

function ensureCustomElementDefined(Constructor: CustomElementConstructor & { readonly tagName: string }): void {
  const { tagName } = Constructor;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Constructor);
  }
}

function createDefinedElement<Class extends CustomElementConstructor & { readonly tagName: string }>(
  Constructor: Class
): InstanceType<Class> {
  ensureCustomElementDefined(Constructor);
  return document.createElement(Constructor.tagName) as InstanceType<Class>;
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function createOverlayStore(): AnyPlayerStore {
  return createStore<unknown>()<OverlayTestState>({
    name: 'overlay',
    state: ({ get, set }) => ({
      userActive: false,
      controlsVisible: false,
      error: null,
      toggleControls() {
        const visible = !(get().controlsVisible as boolean);

        set({ userActive: visible, controlsVisible: visible });

        return visible;
      },
      dismissError() {
        set({ error: null });
      },
      setControlsVisible(visible) {
        set({ userActive: visible, controlsVisible: visible });
      },
      setError(error) {
        set({ error });
      },
    }),
  }) as unknown as AnyPlayerStore;
}

class TestOverlayPlayerProviderElement extends MediaElement {
  store = createOverlayStore();

  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }

  setControlsVisible(visible: boolean): void {
    const state = this.store.state as OverlayTestState;

    state.setControlsVisible(visible);
    flush();
  }

  setError(error: MediaError | null): void {
    const state = this.store.state as OverlayTestState;

    state.setError(error);
    flush();
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForAssertion(assertion: () => void): Promise<void> {
  let error: unknown;

  for (let index = 0; index < 10; index++) {
    try {
      assertion();
      return;
    } catch (caught) {
      error = caught;
      await nextFrame();
    }
  }

  throw error;
}

defineElement('test-overlay-player-provider', TestOverlayPlayerProviderElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OverlayElement', () => {
  it('reflects controls and error visibility through data attrs', async () => {
    const provider = document.createElement('test-overlay-player-provider') as TestOverlayPlayerProviderElement;
    const overlay = createDefinedElement(OverlayElement);

    document.body.append(provider);
    provider.append(overlay);

    await overlay.updateComplete;

    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.hasAttribute('data-visible')).toBe(false);

    provider.setControlsVisible(true);

    await waitForAssertion(() => {
      expect(overlay.hasAttribute('data-visible')).toBe(true);
      expect(overlay.hasAttribute('data-controls-visible')).toBe(true);
      expect(overlay.hasAttribute('data-error-visible')).toBe(false);
    });

    provider.setControlsVisible(false);
    provider.setError({ code: 1, message: 'failed' });

    await waitForAssertion(() => {
      expect(overlay.hasAttribute('data-visible')).toBe(true);
      expect(overlay.hasAttribute('data-controls-visible')).toBe(false);
      expect(overlay.hasAttribute('data-error-visible')).toBe(true);
    });
  });
});
