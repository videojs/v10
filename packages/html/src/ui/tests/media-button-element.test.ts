import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { playbackFeature } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistryForTesting } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaI18nProviderElement } from '../../i18n/define-elements';
import { playerContext } from '../../player/context';
import { MediaElement } from '../media-element';
import { PlayButtonElement } from '../play-button/play-button-element';

function ensureDefined(ctor: CustomElementConstructor & { readonly tagName: string }): void {
  if (!customElements.get(ctor.tagName)) {
    customElements.define(ctor.tagName, ctor);
  }
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function createPlaybackStore(): AnyPlayerStore {
  const store = createStore<PlayerTarget>()(playbackFeature) as unknown as AnyPlayerStore;
  const video = document.createElement('video');
  Object.defineProperty(video, 'paused', { value: true, configurable: true });
  Object.defineProperty(video, 'ended', { value: false, configurable: true });
  Object.defineProperty(video, 'readyState', {
    value: HTMLMediaElement.HAVE_ENOUGH_DATA,
    configurable: true,
  });
  store.attach({ media: video, container: null });
  return store;
}

class TestPlayerProviderElement extends MediaElement {
  static readonly tagName = 'test-media-button-player';

  store = createPlaybackStore();

  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }
}

defineElement(TestPlayerProviderElement.tagName, TestPlayerProviderElement);

describe('MediaButtonElement', () => {
  afterEach(() => {
    resetI18nRegistryForTesting();
    document.body.innerHTML = '';
  });

  it('applies translated aria-label and updates on locale change', async () => {
    registerI18n('es', { play: 'Reproducir' });
    registerI18n('fr', { play: 'Lire' });

    ensureDefined(PlayButtonElement);
    ensureDefined(MediaI18nProviderElement);

    const player = document.createElement(TestPlayerProviderElement.tagName) as TestPlayerProviderElement;
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'es');
    const button = document.createElement(PlayButtonElement.tagName) as PlayButtonElement;

    document.body.append(player);
    player.append(provider);
    provider.append(button);

    await button.updateComplete;
    expect(button.getAttribute('aria-label')).toBe('Reproducir');

    provider.setAttribute('lang', 'fr');
    await vi.waitFor(() => {
      expect(button.getAttribute('aria-label')).toBe('Lire');
    });

    flush();
  });
});
