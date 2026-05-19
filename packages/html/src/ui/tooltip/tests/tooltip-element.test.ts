import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { playbackFeature } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistryForTesting } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { MediaI18nProviderElement } from '../../../i18n';
import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { PlayButtonElement } from '../../play-button/play-button-element';
import { TooltipElement } from '../tooltip-element';

class TestPlayerProviderElement extends MediaElement {
  static readonly tagName = 'test-tooltip-player';

  store = createPlaybackStore();

  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
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

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function ensureDefined(ctor: CustomElementConstructor & { readonly tagName: string }): void {
  defineElement(ctor.tagName, ctor);
}

defineElement(TestPlayerProviderElement.tagName, TestPlayerProviderElement);

describe('TooltipElement', () => {
  afterEach(() => {
    resetI18nRegistryForTesting();
    document.body.innerHTML = '';
  });

  it('shows translated label from the trigger control', async () => {
    registerI18n('es', { play: 'Reproducir' });

    ensureDefined(TestPlayerProviderElement);
    ensureDefined(PlayButtonElement);
    ensureDefined(TooltipElement);
    ensureDefined(MediaI18nProviderElement);

    const player = document.createElement(TestPlayerProviderElement.tagName) as TestPlayerProviderElement;
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'es');

    const button = document.createElement(PlayButtonElement.tagName) as PlayButtonElement;
    button.setAttribute('commandfor', 'tip');

    const tooltip = document.createElement(TooltipElement.tagName) as TooltipElement;
    tooltip.id = 'tip';
    tooltip.setAttribute('open', '');

    document.body.append(player);
    player.append(provider);
    provider.append(button, tooltip);

    await button.updateComplete;
    await tooltip.updateComplete;

    expect(tooltip.textContent).toBe('Reproducir');
  });
});
