import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { controlsFeature, metadataFeature, playbackFeature } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { combine, createStore } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { TitleElement } from '../title-element';

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

/** Store notifications are coalesced, so poll rather than awaiting a single update. */
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

/** Satisfies the pause, seek, and source capabilities `playbackFeature` attaches to. */
class FakeMedia extends EventTarget {
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 100;
  seeking = false;
  src = 'https://example.com/video.mp4';
  currentSrc = 'https://example.com/video.mp4';
  readyState = 4;

  load(): void {}

  pause(): void {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  play(): void {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }
}

function createTitleStore() {
  return createStore<PlayerTarget>()(combine(metadataFeature, controlsFeature, playbackFeature));
}

/** A player without the controls and playback features. */
function createMetadataOnlyStore() {
  return createStore<PlayerTarget>()(metadataFeature);
}

type TitleStore = ReturnType<typeof createTitleStore>;

class TestPlayerProviderElement extends MediaElement {
  store: AnyPlayerStore = createTitleStore() as unknown as AnyPlayerStore;

  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }
}

defineElement('test-title-player', TestPlayerProviderElement);

async function setup(store?: { setContentTitle(value: string | null): void }) {
  const provider = document.createElement('test-title-player') as TestPlayerProviderElement;
  if (store) provider.store = store as unknown as AnyPlayerStore;

  const title = createElement(TitleElement);

  document.body.append(provider);
  provider.append(title);
  await title.updateComplete;

  return { provider, title };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TitleElement', () => {
  it('renders the resolved content title as text', async () => {
    const store = createTitleStore();
    const { title } = await setup(store);

    store.setContentTitle('Sintel');

    await waitForAssertion(() => expect(title.textContent).toBe('Sintel'));
  });

  it('renders empty text when no source supplies a title', async () => {
    const { title } = await setup();

    expect(title.textContent).toBe('');
    expect(title.hasAttribute('data-has-title')).toBe(false);
  });

  it('sets data-has-title once a title resolves and removes it when cleared', async () => {
    const store = createTitleStore();
    const { title } = await setup(store);

    store.setContentTitle('Sintel');
    await waitForAssertion(() => expect(title.hasAttribute('data-has-title')).toBe(true));

    store.setContentTitle(null);
    await waitForAssertion(() => expect(title.hasAttribute('data-has-title')).toBe(false));
  });

  it('hides the title once attached media starts playing', async () => {
    const store: TitleStore = createTitleStore();
    const media = new FakeMedia();
    store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

    const { title } = await setup(store);

    store.setContentTitle('Sintel');
    await waitForAssertion(() => expect(title.hasAttribute('data-visible')).toBe(true));

    media.play();
    await waitForAssertion(() => expect(title.hasAttribute('data-visible')).toBe(false));

    media.pause();
    await waitForAssertion(() => expect(title.hasAttribute('data-visible')).toBe(true));
  });

  it('hides the title when controls are hidden', async () => {
    const store = createTitleStore();
    const { title } = await setup(store);

    store.setContentTitle('Sintel');
    await waitForAssertion(() => expect(title.hasAttribute('data-visible')).toBe(true));

    store.toggleControls();
    await waitForAssertion(() => {
      expect(title.hasAttribute('data-has-title')).toBe(true);
      expect(title.hasAttribute('data-visible')).toBe(false);
    });
  });

  it('keeps the title visible without the controls and playback features', async () => {
    const store = createMetadataOnlyStore();
    const { title } = await setup(store);

    store.setContentTitle('Sintel');

    await waitForAssertion(() => {
      expect(title.textContent).toBe('Sintel');
      expect(title.hasAttribute('data-visible')).toBe(true);
    });
  });

  it('owns its text content across updates', async () => {
    const store = createTitleStore();
    const { title } = await setup(store);

    store.setContentTitle('Sintel');
    await waitForAssertion(() => expect(title.textContent).toBe('Sintel'));

    store.setContentTitle('Big Buck Bunny');
    await waitForAssertion(() => expect(title.textContent).toBe('Big Buck Bunny'));
  });
});
