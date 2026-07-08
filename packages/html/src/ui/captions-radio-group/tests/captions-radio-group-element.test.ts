import type { MediaTextTrackState } from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaI18nProviderElement } from '../../../i18n/provider-element';
import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuElement } from '../../menu/menu-element';
import { MenuRadioItemElement } from '../../menu/menu-radio-item-element';
import { CaptionsRadioGroupElement } from '../captions-radio-group-element';

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
  textTrackList = [{ kind: 'captions', label: '', language: '', mode: 'disabled' }],
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
  readonly #provider = new ContextProvider(this, { context: playerContext });

  setStore(store: AnyPlayerStore): void {
    this.#provider.setValue(store);
  }
}

defineElement(MenuElement.tagName, MenuElement);
defineElement(MenuRadioItemElement.tagName, MenuRadioItemElement);
defineElement(CaptionsRadioGroupElement.tagName, CaptionsRadioGroupElement);
defineElement(MediaI18nProviderElement.tagName, MediaI18nProviderElement);
defineElement('test-captions-radio-player', TestPlayerProviderElement);

function setup(locale: string, storeOptions?: Parameters<typeof createTextTrackStore>[0]) {
  const i18n = new MediaI18nProviderElement();
  const provider = document.createElement('test-captions-radio-player') as TestPlayerProviderElement;
  const menu = document.createElement(MenuElement.tagName) as MenuElement;
  const options = document.createElement(CaptionsRadioGroupElement.tagName) as CaptionsRadioGroupElement;

  i18n.setAttribute('lang', locale);
  provider.setStore(createTextTrackStore(storeOptions));
  menu.append(options);
  provider.append(menu);
  i18n.append(provider);
  document.body.append(i18n);

  return { menu, options };
}

afterEach(() => {
  resetI18nRegistry();
  document.body.innerHTML = '';
});

describe('CaptionsRadioGroupElement', () => {
  it('uses the stateful core label for aria-label', async () => {
    const { options } = setup('en');

    await options.updateComplete;
    expect(options.getAttribute('aria-label')).toBe('Enable captions');

    const enabled = setup('en', { subtitlesShowing: true }).options;

    await enabled.updateComplete;
    expect(enabled.getAttribute('aria-label')).toBe('Disable captions');
  });

  it('refreshes translated items when registry strings load for the active locale', async () => {
    const { menu, options } = setup('x-test-captions');

    await options.updateComplete;

    registerI18n('x-test-captions', { Captions: 'Legendes', Off: 'Desactive' });

    await waitForAssertion(() => {
      const items = [...menu.querySelectorAll<MenuRadioItemElement>(MenuRadioItemElement.tagName)];
      expect(items.map((item) => item.textContent)).toEqual(['Desactive', 'Legendes']);
    });
  });
});
