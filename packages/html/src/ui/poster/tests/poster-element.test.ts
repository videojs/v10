import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { metadataFeature, playbackFeature } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { combine, createStore } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { PosterElement } from '../poster-element';

function ensureDefined(ctor: CustomElementConstructor & { readonly tagName: string }): void {
  if (!customElements.get(ctor.tagName)) customElements.define(ctor.tagName, ctor);
}

class TestProviderElement extends MediaElement {
  static readonly tagName = 'test-poster-provider';

  readonly store = createStore<PlayerTarget>()(combine(playbackFeature, metadataFeature)) as unknown as AnyPlayerStore;

  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }
}

interface Harness {
  poster: PosterElement;
  /** The image the element owns, in its shadow root. */
  owned: HTMLImageElement;
  setPoster(value: string | null): Promise<void>;
  start(): Promise<void>;
  settle(): Promise<void>;
}

/**
 * Mounts the poster the way a skin does: inside a shadow root that forwards its
 * own `<slot name="poster">` into the element.
 */
async function mount(options: { authorImage?: boolean } = {}): Promise<Harness> {
  ensureDefined(TestProviderElement);
  ensureDefined(PosterElement);

  const provider = document.createElement(TestProviderElement.tagName) as TestProviderElement;
  document.body.appendChild(provider);

  const skin = provider.attachShadow({ mode: 'open' });
  skin.innerHTML = `<${PosterElement.tagName}><slot name="poster"></slot></${PosterElement.tagName}>`;
  const poster = skin.querySelector(PosterElement.tagName) as PosterElement;

  if (options.authorImage) {
    const image = document.createElement('img');
    image.slot = 'poster';
    image.src = 'author.jpg';
    image.alt = 'Keynote speaker';
    provider.appendChild(image);
  }

  const video = document.createElement('video');
  provider.store.attach({ media: video, container: null });

  await poster.updateComplete;

  const settle = async () => {
    poster.requestUpdate();
    await poster.updateComplete;
  };

  return {
    poster,
    owned: poster.shadowRoot!.querySelector('img')!,
    settle,
    async setPoster(value) {
      (provider.store as unknown as { setPoster(value: string | null): void }).setPoster(value);
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

describe('PosterElement', () => {
  it('renders the resolved poster in an image it owns', async () => {
    const { owned, setPoster } = await mount();

    await setPoster('poster.jpg');

    expect(owned.getAttribute('src')).toBe('poster.jpg');
    expect(owned.hidden).toBe(false);
    expect(owned.getAttribute('part')).toBe('img');
    expect(owned.alt).toBe('');
  });

  it('withholds the src until one resolves, so nothing is fetched', async () => {
    const { owned } = await mount();

    expect(owned.hasAttribute('src')).toBe(false);
    expect(owned.hidden).toBe(true);
  });

  it('clears the src when the poster goes away', async () => {
    const { owned, setPoster } = await mount();

    await setPoster('poster.jpg');
    await setPoster(null);

    expect(owned.hasAttribute('src')).toBe(false);
    expect(owned.hidden).toBe(true);
  });

  it('steps aside for an image the author slotted, and does not fetch its own', async () => {
    const { owned, setPoster } = await mount({ authorImage: true });

    await setPoster('poster.jpg');

    expect(owned.hidden).toBe(true);
    expect(owned.hasAttribute('src')).toBe(false);
  });

  it('takes over when the author removes their image', async () => {
    const { poster, owned, setPoster, settle } = await mount({ authorImage: true });

    await setPoster('poster.jpg');
    expect(owned.hidden).toBe(true);

    (poster.getRootNode() as ShadowRoot).host.querySelector('img')!.remove();
    await settle();

    expect(owned.hidden).toBe(false);
    expect(owned.getAttribute('src')).toBe('poster.jpg');
  });

  it('hides once playback starts', async () => {
    const { poster, setPoster, start } = await mount();

    await setPoster('poster.jpg');
    expect(poster.hasAttribute('data-visible')).toBe(true);

    await start();

    expect(poster.hasAttribute('data-visible')).toBe(false);
  });

  it('reports load on the host, where a selector can reach it', async () => {
    const { poster, owned, setPoster } = await mount();

    await setPoster('poster.jpg');
    expect(poster.hasAttribute('data-loaded')).toBe(false);

    Object.defineProperty(owned, 'complete', { value: true, configurable: true });
    Object.defineProperty(owned, 'naturalWidth', { value: 640, configurable: true });
    owned.dispatchEvent(new Event('load'));

    expect(poster.hasAttribute('data-loaded')).toBe(true);
  });

  it('drops the load report when the poster changes', async () => {
    const { poster, owned, setPoster } = await mount();

    await setPoster('poster.jpg');
    Object.defineProperty(owned, 'complete', { value: true, configurable: true });
    Object.defineProperty(owned, 'naturalWidth', { value: 640, configurable: true });
    owned.dispatchEvent(new Event('load'));
    expect(poster.hasAttribute('data-loaded')).toBe(true);

    Object.defineProperty(owned, 'complete', { value: false, configurable: true });
    await setPoster('next.jpg');

    expect(poster.hasAttribute('data-loaded')).toBe(false);
  });
});
