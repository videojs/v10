import type { MediaFeatureAvailability, MediaVolumeState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MediaFeatureElement } from '../media-feature-element';

interface MediaFeatureTestState extends MediaVolumeState {
  setVolumeAvailability(availability: MediaFeatureAvailability): void;
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

function createMediaFeatureStore(): AnyPlayerStore {
  return createStore<unknown>()<MediaFeatureTestState>({
    name: 'media-feature',
    state: ({ get, set }) => ({
      volume: 1,
      muted: false,
      volumeAvailability: 'available',
      setVolume(volume) {
        set({ volume });
        return volume;
      },
      toggleMuted() {
        const muted = !(get().muted as boolean);
        set({ muted });
        return muted;
      },
      setVolumeAvailability(availability) {
        set({ volumeAvailability: availability });
      },
    }),
  }) as unknown as AnyPlayerStore;
}

class TestMediaFeaturePlayerProviderElement extends MediaElement {
  store = createMediaFeatureStore();

  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }

  setVolumeAvailability(availability: MediaFeatureAvailability): void {
    const state = this.store.state as MediaFeatureTestState;

    state.setVolumeAvailability(availability);
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

function defaultSlot(element: MediaFeatureElement): HTMLSlotElement {
  return element.shadowRoot!.querySelector('slot')!;
}

defineElement('test-media-feature-player-provider', TestMediaFeaturePlayerProviderElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MediaFeatureElement', () => {
  it('toggles the default slot for matching when availability', async () => {
    const provider = document.createElement(
      'test-media-feature-player-provider'
    ) as TestMediaFeaturePlayerProviderElement;
    const mediaFeature = createDefinedElement(MediaFeatureElement);
    const content = document.createElement('span');

    mediaFeature.is = 'volume';
    mediaFeature.when = 'unsupported';
    content.textContent = 'Fallback';
    mediaFeature.append(content);

    document.body.append(provider);
    provider.append(mediaFeature);

    await mediaFeature.updateComplete;

    expect(defaultSlot(mediaFeature).hidden).toBe(true);
    expect(mediaFeature.contains(content)).toBe(true);
    expect(mediaFeature.dataset.availability).toBe('available');

    provider.setVolumeAvailability('unsupported');

    await waitForAssertion(() => {
      expect(defaultSlot(mediaFeature).hidden).toBe(false);
      expect(mediaFeature.dataset.availability).toBe('unsupported');
    });
  });

  it('toggles the default slot for except availability', async () => {
    const provider = document.createElement(
      'test-media-feature-player-provider'
    ) as TestMediaFeaturePlayerProviderElement;
    const mediaFeature = createDefinedElement(MediaFeatureElement);

    mediaFeature.is = 'volume';
    mediaFeature.except = 'unsupported';
    mediaFeature.textContent = 'Popover';

    document.body.append(provider);
    provider.append(mediaFeature);

    await mediaFeature.updateComplete;

    expect(defaultSlot(mediaFeature).hidden).toBe(false);

    provider.setVolumeAvailability('unsupported');

    await waitForAssertion(() => {
      expect(defaultSlot(mediaFeature).hidden).toBe(true);
    });
  });
});
