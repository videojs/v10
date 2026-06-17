import type { MediaTextTrackState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuElement } from '../menu-element';
import { MenuItemElement } from '../menu-item-element';

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
  textTrackList = [],
  subtitlesShowing = false,
  selectSubtitlesTrack = vi.fn(),
}: {
  textTrackList?: MediaTextTrackState['textTrackList'] | undefined;
  subtitlesShowing?: boolean | undefined;
  selectSubtitlesTrack?: MediaTextTrackState['selectSubtitlesTrack'] | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaTextTrackState>({
    name: 'textTrack',
    state: () => ({
      chaptersCues: [],
      thumbnailCues: [],
      thumbnailTrackSrc: null,
      textTrackList,
      subtitlesShowing,
      toggleSubtitles: vi.fn(),
      selectSubtitlesTrack,
    }),
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

defineElement(MenuItemElement.tagName, MenuItemElement);
defineElement(MenuElement.tagName, MenuElement);
defineElement('test-menu-item-player', TestPlayerProviderElement);

describe('MenuItemElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('marks submenu triggers unavailable when captions type has no tracks', async () => {
    const provider = document.createElement('test-menu-item-player') as TestPlayerProviderElement;
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    const menuItem = document.createElement(MenuItemElement.tagName) as MenuItemElement;

    provider.setStore(createTextTrackStore({ textTrackList: [] }));
    menuItem.type = 'captions';
    menuItem.commandfor = 'settings-captions-menu';
    menu.append(menuItem);
    provider.append(menu);
    document.body.append(provider);

    await menu.updateComplete;
    await menuItem.updateComplete;
    await waitForAssertion(() => {
      expect(menuItem.getAttribute('data-availability')).toBe('unavailable');
      expect(menuItem.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
