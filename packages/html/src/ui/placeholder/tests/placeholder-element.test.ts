import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { metadataFeature, playbackFeature } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { combine, createStore } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { PlaceholderElement } from '../placeholder-element';

function ensureDefined(ctor: CustomElementConstructor & { readonly tagName: string }): void {
  if (!customElements.get(ctor.tagName)) customElements.define(ctor.tagName, ctor);
}

class TestProviderElement extends MediaElement {
  static readonly tagName = 'test-placeholder-provider';

  readonly store = createStore<PlayerTarget>()(combine(playbackFeature, metadataFeature)) as unknown as AnyPlayerStore;

  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }
}

interface Harness {
  provider: TestProviderElement;
  placeholder: PlaceholderElement;
  setPlaceholder(value: string | null): Promise<void>;
  start(): Promise<void>;
}

async function mount(): Promise<Harness> {
  ensureDefined(TestProviderElement);
  ensureDefined(PlaceholderElement);

  const provider = document.createElement(TestProviderElement.tagName) as TestProviderElement;
  const placeholder = document.createElement(PlaceholderElement.tagName) as PlaceholderElement;
  provider.appendChild(placeholder);
  document.body.appendChild(provider);

  const video = document.createElement('video');
  provider.store.attach({ media: video, container: null });

  await placeholder.updateComplete;

  const settle = async () => {
    placeholder.requestUpdate();
    await placeholder.updateComplete;
  };

  return {
    provider,
    placeholder,
    async setPlaceholder(value) {
      (provider.store as unknown as { setPlaceholder(value: string | null): void }).setPlaceholder(value);
      await settle();
    },
    async start() {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
      await settle();
    },
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('PlaceholderElement', () => {
  it('paints the resolved placeholder as its background image', async () => {
    const { placeholder, setPlaceholder } = await mount();

    await setPlaceholder('tiny.jpg');

    expect(placeholder.style.backgroundImage).toBe('url("tiny.jpg")');
  });

  it('stops painting when the placeholder goes away', async () => {
    const { placeholder, setPlaceholder } = await mount();

    await setPlaceholder('tiny.jpg');
    await setPlaceholder(null);

    expect(placeholder.style.backgroundImage).toBe('');
  });

  it('paints nothing when nothing supplied a placeholder', async () => {
    const { placeholder } = await mount();

    expect(placeholder.style.backgroundImage).toBe('');
    expect(placeholder.hasAttribute('data-visible')).toBe(true);
  });

  it('hides once playback starts', async () => {
    const { placeholder, setPlaceholder, start } = await mount();

    await setPlaceholder('tiny.jpg');
    expect(placeholder.hasAttribute('data-visible')).toBe(true);

    await start();

    expect(placeholder.hasAttribute('data-visible')).toBe(false);
    // The image stays put so the fade-out has something to fade.
    expect(placeholder.style.backgroundImage).toBe('url("tiny.jpg")');
  });

  it('adds no children of its own', async () => {
    const { placeholder } = await mount();

    expect(placeholder.shadowRoot).toBe(null);
    expect(placeholder.childNodes).toHaveLength(0);
  });
});
