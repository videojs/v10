import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { createHotkey, HOTKEY_SHORTCUT_CHANGE_EVENT, playbackFeature } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaI18nProviderElement } from '../../i18n';
import { containerContext, playerContext } from '../../player/context';
import { MediaElement } from '../media-element';
import { PlayButtonElement } from '../play-button/play-button-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

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

class TestContainerProviderElement extends MediaElement {
  readonly provider = new ContextProvider(this, {
    context: containerContext,
    initialValue: {
      container: this,
      setContainer: () => {},
    },
  });
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

afterEach(() => {
  resetI18nRegistry();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('lang');
  vi.restoreAllMocks();
});

describe('MediaButtonElement', () => {
  it('emits shortcut changes before media is attached', async () => {
    const provider = createElement(TestContainerProviderElement);
    const button = createElement(PlayButtonElement);
    const onShortcutChange = vi.fn();

    button.addEventListener(HOTKEY_SHORTCUT_CHANGE_EVENT, onShortcutChange);
    provider.append(button);
    document.body.append(provider);

    await button.updateComplete;

    createHotkey(provider, {
      keys: 'k',
      action: 'togglePaused',
      onActivate: () => {},
    });

    await button.updateComplete;

    expect(onShortcutChange).toHaveBeenCalledTimes(1);
    expect(button.getShortcut()).toBe('K');
  });

  it('applies translated aria-label and updates on locale change', async () => {
    registerI18n('es', { Play: 'Reproducir' });
    registerI18n('fr', { Play: 'Lire' });

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

  it('updates aria-label when html lang changes and provider has no explicit lang', async () => {
    registerI18n('de', { Play: 'Los' });
    registerI18n('fr', { Play: 'Lire' });
    document.documentElement.lang = 'de';

    ensureDefined(PlayButtonElement);
    ensureDefined(MediaI18nProviderElement);

    const player = document.createElement(TestPlayerProviderElement.tagName) as TestPlayerProviderElement;
    const provider = new MediaI18nProviderElement();
    const button = document.createElement(PlayButtonElement.tagName) as PlayButtonElement;

    document.body.append(player);
    player.append(provider);
    provider.append(button);

    await vi.waitFor(() => {
      expect(button.getAttribute('aria-label')).toBe('Los');
    });

    document.documentElement.lang = 'fr';
    await vi.waitFor(() => {
      expect(button.getAttribute('aria-label')).toBe('Lire');
    });

    flush();
  });
});
