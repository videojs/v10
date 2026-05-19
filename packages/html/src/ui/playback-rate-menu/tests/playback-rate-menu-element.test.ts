import type { MediaPlaybackRateState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuItemIndicatorElement } from '../../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../../menu/menu-radio-item-element';
import { PlaybackRateMenuElement } from '../playback-rate-menu-element';
import { PlaybackRateMenuTriggerElement } from '../playback-rate-menu-trigger-element';
import { PlaybackRateOptionsElement } from '../playback-rate-options-element';

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

defineElement(MenuRadioGroupElement.tagName, MenuRadioGroupElement);
defineElement(MenuRadioItemElement.tagName, MenuRadioItemElement);
defineElement(MenuItemIndicatorElement.tagName, MenuItemIndicatorElement);
defineElement(PlaybackRateOptionsElement.tagName, PlaybackRateOptionsElement);
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
  const trigger = createElement(PlaybackRateMenuTriggerElement);
  const menu = createElement(PlaybackRateMenuElement);
  const options = createElement(PlaybackRateOptionsElement);

  provider.setStore(store);
  trigger.commandfor = 'playback-rate-menu';
  menu.id = 'playback-rate-menu';

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
  menu: PlaybackRateMenuElement,
  trigger?: PlaybackRateMenuTriggerElement,
  options?: PlaybackRateOptionsElement
): Promise<void> {
  await trigger?.updateComplete;
  await menu.updateComplete;
  await options?.updateComplete;

  const group = menu.querySelector<PlaybackRateOptionsElement>(PlaybackRateOptionsElement.tagName);
  await group?.updateComplete;

  const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
  const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

  await Promise.all(items.map((item) => item.updateComplete));
  await Promise.all(indicators.map((indicator) => indicator.updateComplete));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlaybackRateMenuElement', () => {
  it('renders radio items from the available playback rates', async () => {
    const { menu, trigger } = setup({ playbackRates: [1, 1.25, 1.5], playbackRate: 1.25 });

    await waitForMenu(menu, trigger);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];

    expect(items.map((item) => item.textContent)).toEqual(['1×', '1.25×', '1.5×']);
    await waitForAssertion(() => {
      expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    });
    expect(menu.getAttribute('aria-label')).toBe('Playback rate 1.25');
    expect(menu.getAttribute('data-rate')).toBe('1.25');
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

  it('center aligns the root popup by default', async () => {
    const { menu, trigger } = setup();

    await waitForMenu(menu, trigger);

    expect(menu.align).toBe('center');
    expect(menu.getAttribute('data-align')).toBe('center');
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

describe('PlaybackRateMenuTriggerElement', () => {
  it('renders a dynamic trigger from the current playback rate', async () => {
    const { trigger } = setup({ playbackRate: 2 });

    await trigger.updateComplete;

    expect(trigger.getAttribute('role')).toBe('button');
    expect(trigger.getAttribute('aria-label')).toBe('Playback rate 2');
    expect(trigger.getAttribute('data-rate')).toBe('2');
  });

  it('prevents activation when there are no playback rates', async () => {
    const { trigger } = setup({ playbackRates: [] });

    await trigger.updateComplete;

    const onClick = vi.fn();
    trigger.addEventListener('click', onClick);
    trigger.click();

    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.hasAttribute('data-disabled')).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
