import type { MediaAudioTrackState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaI18nProviderElement } from '../../../i18n/provider-element';
import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuElement } from '../../menu/menu-element';
import { MenuItemIndicatorElement } from '../../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../../menu/menu-radio-item-element';
import { AudioTrackRadioGroupElement } from '../audio-track-radio-group-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
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

function createAudioTrackStore({
  audioTrackList = [
    { id: '0', kind: 'main', label: 'English', language: 'en', enabled: true },
    { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: false },
  ],
  selectAudioTrack = vi.fn(),
}: {
  audioTrackList?: MediaAudioTrackState['audioTrackList'] | undefined;
  selectAudioTrack?: MediaAudioTrackState['selectAudioTrack'] | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaAudioTrackState>({
    name: 'audioTrack',
    state: () => ({
      audioTrackList,
      selectAudioTrack,
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  store: AnyPlayerStore = createAudioTrackStore();

  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }

  setStore(store: AnyPlayerStore): void {
    this.store = store;
    this.#provider.setValue(store);
  }
}

defineElement(MenuElement.tagName, MenuElement);
defineElement(MenuRadioGroupElement.tagName, MenuRadioGroupElement);
defineElement(MenuRadioItemElement.tagName, MenuRadioItemElement);
defineElement(MenuItemIndicatorElement.tagName, MenuItemIndicatorElement);
defineElement(AudioTrackRadioGroupElement.tagName, AudioTrackRadioGroupElement);
defineElement(MediaI18nProviderElement.tagName, MediaI18nProviderElement);
defineElement('test-audio-track-player', TestPlayerProviderElement);

function setup({
  audioTrackList,
  selectAudioTrack,
  template,
  locale,
}: {
  audioTrackList?: MediaAudioTrackState['audioTrackList'] | undefined;
  selectAudioTrack?: MediaAudioTrackState['selectAudioTrack'] | undefined;
  template?: string | undefined;
  locale?: string | undefined;
} = {}) {
  const store = createAudioTrackStore({ audioTrackList, selectAudioTrack });
  const provider = document.createElement('test-audio-track-player') as TestPlayerProviderElement;
  const menu = createElement(MenuElement);
  const options = createElement(AudioTrackRadioGroupElement);

  provider.setStore(store);

  if (template) {
    const templateElement = document.createElement('template');
    templateElement.innerHTML = template;
    options.append(templateElement);
  }

  menu.append(options);
  provider.append(menu);

  if (locale) {
    const i18n = new MediaI18nProviderElement();
    i18n.setAttribute('lang', locale);
    i18n.append(provider);
    document.body.append(i18n);
  } else {
    document.body.append(provider);
  }

  return { menu, options };
}

async function waitForMenu(menu: MenuElement, options?: AudioTrackRadioGroupElement): Promise<void> {
  await menu.updateComplete;
  await options?.updateComplete;

  const group = menu.querySelector<AudioTrackRadioGroupElement>(AudioTrackRadioGroupElement.tagName);
  await group?.updateComplete;

  const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
  const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

  await Promise.all(items.map((item) => item.updateComplete));
  await Promise.all(indicators.map((indicator) => indicator.updateComplete));
}

afterEach(() => {
  resetI18nRegistry();
  document.body.innerHTML = '';
});

describe('AudioTrackRadioGroupElement', () => {
  it('renders audio track radio items', async () => {
    const { menu, options } = setup();

    await waitForMenu(menu, options);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];

    expect(items.map((item) => item.textContent)).toEqual(['English', 'Spanish']);
    await waitForAssertion(() => {
      expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    });
  });

  it('renders radio items from a template', async () => {
    const { menu, options } = setup({
      template:
        '<media-menu-radio-item class="custom-item"><span class="custom-label" data-part="label"></span><media-menu-item-indicator force-mount class="custom-indicator"></media-menu-item-indicator></media-menu-radio-item>',
    });

    await waitForMenu(menu, options);

    const item = menu.querySelector<MenuRadioItemElement>(MenuRadioItemElement.tagName)!;
    const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

    expect(item.className).toBe('custom-item');
    expect(item.querySelector('[data-part~="label"]')?.textContent).toBe('English');
    expect(indicators.map((indicator) => indicator.checked)).toEqual([true, false]);
  });

  it('renders translated default labels', async () => {
    const { menu, options } = setup({
      locale: 'x-test-audio',
      audioTrackList: [
        { id: '0', label: '', language: '', enabled: true },
        { id: '1', label: 'English', language: 'en', enabled: false },
      ],
    });

    await waitForMenu(menu, options);

    registerI18n('x-test-audio', { Audio: 'Sound' });

    await waitForAssertion(() => {
      const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
      expect(items.map((item) => item.textContent)).toEqual(['Sound', 'English']);
    });
  });

  it('renders translated Default track labels', async () => {
    const { menu, options } = setup({
      locale: 'x-test-audio',
      audioTrackList: [
        { id: '0', label: 'Default', language: '', enabled: true },
        { id: '1', label: 'English', language: 'en', enabled: false },
      ],
    });

    await waitForMenu(menu, options);

    registerI18n('x-test-audio', { Default: 'Standard' });

    await waitForAssertion(() => {
      const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
      expect(items.map((item) => item.textContent)).toEqual(['Standard', 'English']);
    });
  });

  it('sets the selected audio track', async () => {
    const selectAudioTrack = vi.fn();
    const { menu, options } = setup({ selectAudioTrack });

    await waitForMenu(menu, options);

    const item = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)].find(
      (candidate) => candidate.value === '1'
    )!;

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(selectAudioTrack).toHaveBeenCalledWith('1');
  });
});
