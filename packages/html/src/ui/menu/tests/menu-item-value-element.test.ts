import type {
  MediaAudioTrackState,
  MediaPlaybackRateState,
  MediaQualityState,
  MediaTextTrackState,
} from '@videojs/core';
import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { MenuItemElement } from '../menu-item-element';
import { MenuItemValueElement } from '../menu-item-value-element';

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
}: {
  playbackRates?: readonly number[] | undefined;
  playbackRate?: number | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaPlaybackRateState>({
    name: 'playbackRate',
    state: () => ({
      playbackRates,
      playbackRate,
      setPlaybackRate: vi.fn(),
    }),
  }) as unknown as AnyPlayerStore;
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

function createQualityStore({
  videoRenditionList = [
    { id: '0', height: 1080, selected: false },
    { id: '1', height: 720, selected: false },
  ],
  activeVideoRendition = null,
}: {
  videoRenditionList?: MediaQualityState['videoRenditionList'] | undefined;
  activeVideoRendition?: MediaQualityState['activeVideoRendition'] | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaQualityState>({
    name: 'quality',
    state: () => ({
      videoRenditionList,
      activeVideoRendition,
      selectVideoRendition: vi.fn(),
    }),
  }) as unknown as AnyPlayerStore;
}

function createAudioTrackStore({
  audioTrackList = [
    { id: '0', kind: 'main', label: 'English', language: 'en', enabled: true },
    { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: false },
  ],
}: {
  audioTrackList?: MediaAudioTrackState['audioTrackList'] | undefined;
} = {}): AnyPlayerStore {
  return createStore<unknown>()<MediaAudioTrackState>({
    name: 'audioTrack',
    state: () => ({
      audioTrackList,
      selectAudioTrack: vi.fn(),
    }),
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

defineElement(MenuItemElement.tagName, MenuItemElement);
defineElement(MenuItemValueElement.tagName, MenuItemValueElement);
defineElement('test-menu-item-value-player', TestPlayerProviderElement);

function setup(
  store: AnyPlayerStore,
  type: MenuItemElement['type']
): {
  menuItem: MenuItemElement;
  value: MenuItemValueElement;
} {
  const provider = document.createElement('test-menu-item-value-player') as TestPlayerProviderElement;
  const menuItem = document.createElement(MenuItemElement.tagName) as MenuItemElement;
  const value = document.createElement(MenuItemValueElement.tagName) as MenuItemValueElement;

  provider.setStore(store);
  menuItem.type = type;
  menuItem.commandfor = 'settings-submenu';
  menuItem.append(value);
  provider.append(menuItem);
  document.body.append(provider);

  return { menuItem, value };
}

describe('MenuItemValueElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the current playback rate label from menu item context', async () => {
    const { value } = setup(createPlaybackRateStore({ playbackRate: 1.5 }), 'playback-rate');

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('1.5×');
    });
  });

  it('does not rewrite an unchanged label', async () => {
    const { value } = setup(createPlaybackRateStore({ playbackRate: 1.5 }), 'playback-rate');

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('1.5×');
    });

    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(value, { childList: true, characterData: true, subtree: true });

    value.requestUpdate();
    await value.updateComplete;
    await nextFrame();
    observer.disconnect();

    expect(mutations).toHaveLength(0);
  });

  it('renders Off when captions are disabled', async () => {
    const { value } = setup(
      createTextTrackStore({
        textTrackList: [{ kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' }],
      }),
      'captions'
    );

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('Off');
    });
  });

  it('renders Auto when quality is automatic', async () => {
    const { value } = setup(createQualityStore(), 'quality');

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('Auto');
    });
  });

  it('renders the active quality label when quality is automatic', async () => {
    const { value } = setup(
      createQualityStore({
        activeVideoRendition: { id: '1', height: 720, selected: false },
      }),
      'quality'
    );

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('Auto (720p)');
    });
  });

  it('renders the selected quality label', async () => {
    const { value } = setup(
      createQualityStore({
        videoRenditionList: [
          { id: '0', height: 1080, selected: false },
          { id: '1', height: 720, selected: true },
        ],
      }),
      'quality'
    );

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('720p');
    });
  });

  it('renders the selected audio track label', async () => {
    const { value } = setup(
      createAudioTrackStore({
        audioTrackList: [
          { id: '0', kind: 'main', label: 'English', language: 'en', enabled: false },
          { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: true },
        ],
      }),
      'audio-track'
    );

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('Spanish');
    });
  });

  it('renders the active caption track label', async () => {
    const { value } = setup(
      createTextTrackStore({
        textTrackList: [
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
          { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
        ],
        subtitlesShowing: true,
      }),
      'captions'
    );

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('English');
    });
  });

  it('clears the label when setting context is removed', async () => {
    const { menuItem, value } = setup(createPlaybackRateStore({ playbackRate: 1.5 }), 'playback-rate');

    await value.updateComplete;
    await waitForAssertion(() => {
      expect(value.textContent).toBe('1.5×');
    });

    menuItem.type = null;
    await menuItem.updateComplete;

    await waitForAssertion(() => {
      expect(value.textContent).toBe('');
    });
  });
});
