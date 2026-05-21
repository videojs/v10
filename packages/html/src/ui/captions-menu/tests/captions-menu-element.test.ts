import type { MediaTextTrackState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuItemIndicatorElement } from '../../menu/menu-item-indicator-element';
import { MenuRadioGroupElement } from '../../menu/menu-radio-group-element';
import { MenuRadioItemElement } from '../../menu/menu-radio-item-element';
import { CaptionsMenuElement } from '../captions-menu-element';
import { CaptionsMenuTriggerElement } from '../captions-menu-trigger-element';
import { CaptionsOptionsElement } from '../captions-options-element';

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

function createTextTrackStore({
  textTrackList = [
    { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
    { kind: 'captions', label: 'CC', language: 'en', mode: 'showing' },
  ],
  subtitlesShowing = true,
  selectTextTrack = vi.fn(),
}: {
  textTrackList?: MediaTextTrackState['textTrackList'] | undefined;
  subtitlesShowing?: boolean | undefined;
  selectTextTrack?: ((trackIndex: number | null) => boolean) | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaTextTrackState>({
    name: 'textTrack',
    state: () => {
      return {
        chaptersCues: [],
        thumbnailCues: [],
        thumbnailTrackSrc: null,
        textTrackList,
        subtitlesShowing,
        toggleSubtitles: vi.fn(() => true),
        selectTextTrack,
      };
    },
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  store: AnyPlayerStore = createTextTrackStore();

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
defineElement(CaptionsOptionsElement.tagName, CaptionsOptionsElement);
defineElement('test-captions-menu-player', TestPlayerProviderElement);

function setup({
  textTrackList,
  subtitlesShowing,
  selectTextTrack,
  template,
}: {
  textTrackList?: MediaTextTrackState['textTrackList'] | undefined;
  subtitlesShowing?: boolean | undefined;
  selectTextTrack?: ((trackIndex: number | null) => boolean) | undefined;
  template?: string | undefined;
} = {}) {
  const store = createTextTrackStore({ textTrackList, subtitlesShowing, selectTextTrack });
  const provider = document.createElement('test-captions-menu-player') as TestPlayerProviderElement;
  const trigger = createElement(CaptionsMenuTriggerElement);
  const menu = createElement(CaptionsMenuElement);
  const options = createElement(CaptionsOptionsElement);

  provider.setStore(store);
  trigger.commandfor = 'captions-menu';
  menu.id = 'captions-menu';

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
  menu: CaptionsMenuElement,
  trigger?: CaptionsMenuTriggerElement,
  options?: CaptionsOptionsElement
): Promise<void> {
  await trigger?.updateComplete;
  await menu.updateComplete;
  await options?.updateComplete;

  const group = menu.querySelector<CaptionsOptionsElement>(CaptionsOptionsElement.tagName);
  await group?.updateComplete;

  const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
  const indicators = [...menu.querySelectorAll<MenuItemIndicatorElement>(MenuItemIndicatorElement.tagName)];

  await Promise.all(items.map((item) => item.updateComplete));
  await Promise.all(indicators.map((indicator) => indicator.updateComplete));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('CaptionsMenuElement', () => {
  it('renders off and text track radio items', async () => {
    const { menu, trigger } = setup();

    await waitForMenu(menu, trigger);

    const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];

    expect(items.map((item) => item.textContent)).toEqual(['Off', 'English', 'CC']);
    await waitForAssertion(() => {
      expect(items.map((item) => item.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
    });
    expect(menu.getAttribute('aria-label')).toBe('Captions CC');
    expect(menu.getAttribute('data-active')).toBe('');
    expect(menu.getAttribute('data-availability')).toBe('available');
  });

  it('syncs descendant section label parts', async () => {
    const { menu, trigger } = setup();
    const section = document.createElement('span');
    section.setAttribute('data-part', 'section-label');
    menu.insertBefore(section, menu.firstChild);

    await waitForMenu(menu, trigger);

    expect(section.textContent).toBe('Captions');
  });

  it('respects menu-section-label on the menu element for section label parts', async () => {
    const { menu, trigger } = setup();
    menu.setAttribute('menu-section-label', 'Subtitles');
    const section = document.createElement('span');
    section.setAttribute('data-part', 'section-label');
    menu.insertBefore(section, menu.firstChild);

    await waitForMenu(menu, trigger);

    expect(section.textContent).toBe('Subtitles');
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
    expect(item.querySelector('[data-part~="label"]')?.textContent).toBe('Off');
    expect(indicators.map((indicator) => indicator.checked)).toEqual([false, false, true]);
  });

  it('sets the selected text track', async () => {
    const selectTextTrack = vi.fn(() => true);
    const { menu, trigger } = setup({ selectTextTrack });

    await waitForMenu(menu, trigger);

    const item = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)].find(
      (candidate) => candidate.value === '0'
    )!;

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(selectTextTrack).toHaveBeenCalledWith(0);
  });

  it('turns captions off', async () => {
    const selectTextTrack = vi.fn(() => true);
    const { menu, trigger } = setup({ selectTextTrack });

    await waitForMenu(menu, trigger);

    const item = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)].find(
      (candidate) => candidate.value === 'off'
    )!;

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(selectTextTrack).toHaveBeenCalledWith(null);
  });
});

describe('CaptionsMenuTriggerElement', () => {
  it('renders availability and active state', async () => {
    const { trigger } = setup();

    await trigger.updateComplete;

    expect(trigger.getAttribute('role')).toBe('button');
    expect(trigger.getAttribute('aria-label')).toBe('Captions CC');
    expect(trigger.getAttribute('data-active')).toBe('');
    expect(trigger.getAttribute('data-availability')).toBe('available');
  });

  it('prevents activation when no captions are available', async () => {
    const { trigger } = setup({
      textTrackList: [{ kind: 'metadata', label: 'thumbnails', language: '', mode: 'hidden' }],
      subtitlesShowing: false,
    });

    await trigger.updateComplete;

    const onClick = vi.fn();
    trigger.addEventListener('click', onClick);
    trigger.click();

    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    expect(trigger.getAttribute('data-availability')).toBe('unavailable');
    expect(trigger.hasAttribute('data-disabled')).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
