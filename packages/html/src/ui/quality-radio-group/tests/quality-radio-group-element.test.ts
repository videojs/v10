import type { MediaQualityState } from '@videojs/core';
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
import { QualityRadioGroupElement } from '../quality-radio-group-element';

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

function createQualityStore({
  videoRenditionList = [
    { id: '0', height: 1080, selected: false },
    { id: '1', height: 720, selected: false },
  ],
  activeVideoRendition = null,
  selectVideoRendition = vi.fn(),
}: {
  videoRenditionList?: MediaQualityState['videoRenditionList'] | undefined;
  activeVideoRendition?: MediaQualityState['activeVideoRendition'] | undefined;
  selectVideoRendition?: MediaQualityState['selectVideoRendition'] | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaQualityState>({
    name: 'quality',
    state: () => ({
      videoRenditionList,
      activeVideoRendition,
      selectVideoRendition,
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  store: AnyPlayerStore = createQualityStore();

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
defineElement(QualityRadioGroupElement.tagName, QualityRadioGroupElement);
defineElement('test-quality-player', TestPlayerProviderElement);

function setup({
  videoRenditionList,
  activeVideoRendition,
  selectVideoRendition,
  template,
}: {
  videoRenditionList?: MediaQualityState['videoRenditionList'] | undefined;
  activeVideoRendition?: MediaQualityState['activeVideoRendition'] | undefined;
  selectVideoRendition?: MediaQualityState['selectVideoRendition'] | undefined;
  template?: string | undefined;
} = {}) {
  const store = createQualityStore({ videoRenditionList, activeVideoRendition, selectVideoRendition });
  const provider = document.createElement('test-quality-player') as TestPlayerProviderElement;
  const menu = createElement(MenuElement);
  const options = createElement(QualityRadioGroupElement);

  provider.setStore(store);

  if (template) {
    const templateElement = document.createElement('template');
    templateElement.innerHTML = template;
    options.append(templateElement);
  }

  menu.append(options);
  provider.append(menu);
  document.body.append(provider);

  return { menu, options };
}

async function waitForMenu(menu: MenuElement, options?: QualityRadioGroupElement): Promise<void> {
  await menu.updateComplete;
  await options?.updateComplete;

  const group = menu.querySelector<QualityRadioGroupElement>(QualityRadioGroupElement.tagName);
  await group?.updateComplete;

  const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
  const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

  await Promise.all(items.map((item) => item.updateComplete));
  await Promise.all(indicators.map((indicator) => indicator.updateComplete));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('QualityRadioGroupElement', () => {
  it('renders Auto and rendition radio items', async () => {
    const { menu, options } = setup();

    await waitForMenu(menu, options);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];

    expect(items.map((item) => item.textContent)).toEqual(['Auto', '1080p HD', '720p']);
    await waitForAssertion(() => {
      expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
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
    expect(item.querySelector('[data-part~="label"]')?.textContent).toBe('Auto');
    expect(indicators.map((indicator) => indicator.checked)).toEqual([true, false, false]);
  });

  it('renders the active rendition in the Auto label', async () => {
    const { menu, options } = setup({
      activeVideoRendition: { id: '1', height: 720, selected: false },
      template:
        '<media-menu-radio-item><span data-part="label"></span><media-menu-item-indicator force-mount></media-menu-item-indicator></media-menu-radio-item>',
    });

    await waitForMenu(menu, options);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];

    expect(items[0]?.querySelector('[data-part~="label"]')?.textContent).toBe('Auto (720p)');
  });

  it('renders bitrate badges from a template', async () => {
    const { menu, options } = setup({
      videoRenditionList: [
        { id: '0', height: 1080, bitrate: 6_000_000, selected: false },
        { id: '1', height: 1080, bitrate: 3_000_000, selected: false },
        { id: '2', height: 720, bitrate: 1_500_000, selected: false },
      ],
      template:
        '<media-menu-radio-item><span data-part="label"></span><sup data-part="tier"></sup><span data-part="badge"></span><media-menu-item-indicator force-mount></media-menu-item-indicator></media-menu-radio-item>',
    });

    await waitForMenu(menu, options);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
    const tiers = items.map((item) => item.querySelector<HTMLElement>('[data-part~="tier"]'));
    const badges = items.map((item) => item.querySelector<HTMLElement>('[data-part~="badge"]'));

    expect(items.map((item) => item.querySelector('[data-part~="label"]')?.textContent)).toEqual([
      'Auto',
      '1080p',
      '1080p',
      '720p',
    ]);
    expect(tiers.map((tier) => tier?.textContent)).toEqual(['', 'HD', 'HD', '']);
    expect(tiers.map((tier) => tier?.hidden)).toEqual([true, false, false, true]);
    expect(badges.map((badge) => badge?.textContent)).toEqual(['', '6 Mbps', '3 Mbps', '']);
    expect(badges.map((badge) => badge?.hidden)).toEqual([true, false, false, true]);
  });

  it('sets the selected rendition', async () => {
    const selectVideoRendition = vi.fn();
    const { menu, options } = setup({ selectVideoRendition });

    await waitForMenu(menu, options);

    const item = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)].find(
      (candidate) => candidate.value === '1'
    )!;

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(selectVideoRendition).toHaveBeenCalledWith('1');
  });
});
