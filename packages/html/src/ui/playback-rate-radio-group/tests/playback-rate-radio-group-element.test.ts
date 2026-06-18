import type { MediaPlaybackRateState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuElement } from '../../menu/menu-element';
import { MenuItemIndicatorElement } from '../../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../../menu/menu-radio-item-element';
import { PlaybackRateButtonElement } from '../../playback-rate-button/playback-rate-button-element';
import { PlaybackRateRadioGroupElement } from '../playback-rate-radio-group-element';

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

function createPlaybackRateStore({
  playbackRates = [0.5, 1, 1.5, 2],
  playbackRate = 1.5,
  setPlaybackRate = vi.fn(),
}: {
  playbackRates?: readonly number[] | undefined;
  playbackRate?: number | undefined;
  setPlaybackRate?: ((rate: number) => void) | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaPlaybackRateState>({
    name: 'playbackRate',
    state: () => {
      return {
        playbackRates,
        playbackRate,
        setPlaybackRate,
      };
    },
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  store: AnyPlayerStore = createPlaybackRateStore();

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
defineElement(PlaybackRateRadioGroupElement.tagName, PlaybackRateRadioGroupElement);
defineElement(PlaybackRateButtonElement.tagName, PlaybackRateButtonElement);
defineElement('test-playback-rate-player', TestPlayerProviderElement);

function setup({
  playbackRates,
  playbackRate,
  setPlaybackRate,
  template,
}: {
  playbackRates?: readonly number[] | undefined;
  playbackRate?: number | undefined;
  setPlaybackRate?: ((rate: number) => void) | undefined;
  template?: string | undefined;
} = {}) {
  const store = createPlaybackRateStore({ playbackRates, playbackRate, setPlaybackRate });
  const provider = document.createElement('test-playback-rate-player') as TestPlayerProviderElement;
  const trigger = createElement(PlaybackRateButtonElement);
  const menu = createElement(MenuElement);
  const options = createElement(PlaybackRateRadioGroupElement);

  provider.setStore(store);
  menu.id = 'playback-rate-menu';
  trigger.setAttribute('commandfor', 'playback-rate-menu');

  if (template) {
    const templateElement = document.createElement('template');
    templateElement.innerHTML = template;
    options.append(templateElement);
  }

  menu.append(options);
  provider.append(trigger, menu);
  document.body.append(provider);

  return { menu, options, provider, store, trigger };
}

async function waitForMenu(
  menu: MenuElement,
  trigger?: PlaybackRateButtonElement,
  options?: PlaybackRateRadioGroupElement
): Promise<void> {
  await trigger?.updateComplete;
  await menu.updateComplete;
  await options?.updateComplete;

  const group = menu.querySelector<PlaybackRateRadioGroupElement>(PlaybackRateRadioGroupElement.tagName);
  await group?.updateComplete;

  const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
  const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

  await Promise.all(items.map((item) => item.updateComplete));
  await Promise.all(indicators.map((indicator) => indicator.updateComplete));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlaybackRateRadioGroupElement', () => {
  it('renders radio items from the available playback rates', async () => {
    const { menu, trigger } = setup({ playbackRates: [1, 1.25, 1.5], playbackRate: 1.25 });

    await waitForMenu(menu, trigger);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];

    expect(items.map((item) => item.textContent)).toEqual(['1×', '1.25×', '1.5×']);
    await waitForAssertion(() => {
      expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    });
  });

  it('renders radio items from a template', async () => {
    const { menu, options, trigger } = setup({
      template:
        '<media-menu-radio-item class="custom-item"><span class="custom-label" data-part="label"></span><media-menu-item-indicator force-mount class="custom-indicator"></media-menu-item-indicator></media-menu-radio-item>',
    });

    await waitForMenu(menu, trigger, options);

    const item = menu.querySelector<MenuRadioItemElement>(MenuRadioItemElement.tagName)!;
    const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

    expect(item.className).toBe('custom-item');
    expect(item.querySelector('[data-part~="label"]')?.textContent).toBe('0.5×');
    expect(indicators.map((indicator) => indicator.checked)).toEqual([false, false, true, false]);
  });

  it('sets the selected playback rate', async () => {
    const setPlaybackRate = vi.fn();
    const { menu, trigger } = setup({ setPlaybackRate });

    await waitForMenu(menu, trigger);

    const item = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)].find(
      (candidate) => candidate.value === '2'
    )!;

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });
});

describe('PlaybackRateButtonElement', () => {
  it('renders the current playback rate on the trigger button', async () => {
    const { trigger } = setup({ playbackRate: 2 });

    await trigger.updateComplete;

    expect(trigger.getAttribute('role')).toBe('button');
    expect(trigger.getAttribute('aria-label')).toBe('Playback rate 2');
    expect(trigger.getAttribute('data-rate')).toBe('2');
  });

  it('does not cycle when commandfor is set', async () => {
    const setPlaybackRate = vi.fn();
    const { trigger, store } = setup({ playbackRate: 1, setPlaybackRate });

    await trigger.updateComplete;

    trigger.click();

    expect(setPlaybackRate).not.toHaveBeenCalled();
    expect((store.state as MediaPlaybackRateState).playbackRate).toBe(1);
  });

  it('opens the linked menu on Enter when commandfor is set', async () => {
    const { menu, trigger } = setup();

    await waitForMenu(menu, trigger);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    await waitForAssertion(() => {
      expect(menu.open).toBe(true);
    });
  });

  it('opens the linked menu on Space when commandfor is set', async () => {
    const { menu, trigger } = setup();

    await waitForMenu(menu, trigger);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    trigger.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));

    await waitForAssertion(() => {
      expect(menu.open).toBe(true);
    });
  });

  it('disables the trigger when there are no playback rates', async () => {
    const { trigger } = setup({ playbackRates: [] });

    await trigger.updateComplete;

    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  it('does not open the linked menu when disabled and clicked', async () => {
    const { menu, trigger } = setup({ playbackRates: [] });

    await waitForMenu(menu, trigger);

    trigger.click();

    expect(menu.open).toBe(false);
  });
});
