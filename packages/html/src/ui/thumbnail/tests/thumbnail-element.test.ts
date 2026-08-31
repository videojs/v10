import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import type { MediaTextTrackState } from '@videojs/media';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { playerContext } from '../../../player/context';
import { UIElement } from '../../ui-element';
import { ThumbnailElement } from '../thumbnail-element';

function createTextTrackStore(
  thumbnailTrackCrossOrigin: MediaTextTrackState['thumbnailTrackCrossOrigin']
): AnyPlayerStore {
  return createStore<unknown>()<MediaTextTrackState>({
    name: 'textTrack',
    state: () => ({
      chaptersCues: [],
      thumbnailCues: [],
      thumbnailTrackSrc: null,
      thumbnailTrackCrossOrigin,
      textTrackList: [],
      subtitlesShowing: false,
      toggleSubtitles: vi.fn(),
      selectSubtitlesTrack: vi.fn(),
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends UIElement {
  readonly #provider = new ContextProvider(this, { context: playerContext });

  setStore(store: AnyPlayerStore): void {
    this.#provider.setValue(store);
  }
}

if (!customElements.get(ThumbnailElement.tagName)) {
  customElements.define(ThumbnailElement.tagName, ThumbnailElement);
}

if (!customElements.get('test-thumbnail-player')) {
  customElements.define('test-thumbnail-player', TestPlayerProviderElement);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Mount a thumbnail inside a player reporting the given media CORS mode and return the `crossorigin` attribute its
 * inner `<img>` settles on. The player context resolves a frame after connect, so settle across a few updates rather
 * than reading the first one.
 */
async function renderCrossOrigin(
  mediaCrossOrigin: MediaTextTrackState['thumbnailTrackCrossOrigin'],
  configure?: (el: ThumbnailElement) => void
): Promise<string | null> {
  const provider = document.createElement('test-thumbnail-player') as TestPlayerProviderElement;
  const thumbnail = document.createElement(ThumbnailElement.tagName) as ThumbnailElement;
  const img = document.createElement('img');

  configure?.(thumbnail);
  provider.setStore(createTextTrackStore(mediaCrossOrigin));
  thumbnail.append(img);
  provider.append(thumbnail);
  document.body.append(provider);

  for (let index = 0; index < 5; index++) {
    await thumbnail.updateComplete;
    await nextFrame();
  }

  return img.getAttribute('crossorigin');
}

describe('ThumbnailElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing of its own and uses a supplied light-DOM image', async () => {
    const thumbnail = document.createElement(ThumbnailElement.tagName) as ThumbnailElement;
    const img = document.createElement('img');

    Object.defineProperty(img, 'complete', { value: false, configurable: true });
    thumbnail.thumbnails = [{ url: 'thumb.jpg', startTime: 0 }];
    thumbnail.append(img);
    document.body.append(thumbnail);
    await thumbnail.updateComplete;

    expect(thumbnail.shadowRoot).toBeNull();
    expect(img.getAttribute('src')).toBe('thumb.jpg');
  });

  it('owns src and srcset on the supplied image', async () => {
    const thumbnail = document.createElement(ThumbnailElement.tagName) as ThumbnailElement;
    const img = document.createElement('img');

    Object.defineProperty(img, 'complete', { value: false, configurable: true });
    img.setAttribute('src', 'authored.jpg');
    img.setAttribute('srcset', 'authored-2x.jpg 2x');
    thumbnail.thumbnails = [{ url: 'thumb.jpg', startTime: 0 }];
    thumbnail.append(img);
    document.body.append(thumbnail);
    await thumbnail.updateComplete;

    expect(img.getAttribute('src')).toBe('thumb.jpg');
    expect(img.hasAttribute('srcset')).toBe(false);

    img.setAttribute('srcset', 'late-authored-2x.jpg 2x');
    await vi.waitFor(() => expect(img.hasAttribute('srcset')).toBe(false));

    thumbnail.thumbnails = [];
    await thumbnail.updateComplete;

    expect(img.hasAttribute('src')).toBe(false);
    expect(img.hasAttribute('srcset')).toBe(false);
  });

  it('adopts an image added after mount', async () => {
    const thumbnail = document.createElement(ThumbnailElement.tagName) as ThumbnailElement;

    thumbnail.thumbnails = [{ url: 'thumb.jpg', startTime: 0 }];
    document.body.append(thumbnail);
    await thumbnail.updateComplete;

    const img = document.createElement('img');

    Object.defineProperty(img, 'complete', { value: false, configurable: true });
    thumbnail.append(img);

    await vi.waitFor(() => expect(img.getAttribute('src')).toBe('thumb.jpg'));
  });

  it('moves source ownership to a replacement image', async () => {
    const thumbnail = document.createElement(ThumbnailElement.tagName) as ThumbnailElement;
    const first = document.createElement('img');

    Object.defineProperty(first, 'complete', { value: false, configurable: true });
    thumbnail.thumbnails = [{ url: 'thumb.jpg', startTime: 0 }];
    thumbnail.append(first);
    document.body.append(thumbnail);
    await thumbnail.updateComplete;

    const second = document.createElement('img');

    Object.defineProperty(second, 'complete', { value: false, configurable: true });
    first.replaceWith(second);

    await vi.waitFor(() => expect(second.getAttribute('src')).toBe('thumb.jpg'));
    expect(first.hasAttribute('src')).toBe(false);
  });

  it('warns when a thumbnail resolves without an image', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const thumbnail = document.createElement(ThumbnailElement.tagName) as ThumbnailElement;

    thumbnail.thumbnails = [{ url: 'thumb.jpg', startTime: 0 }];
    document.body.append(thumbnail);
    await thumbnail.updateComplete;

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('has no image to put it in'));

    warn.mockRestore();
  });

  describe('crossorigin', () => {
    it('inherits the media element CORS mode when unset', async () => {
      await expect(renderCrossOrigin('anonymous')).resolves.toBe('anonymous');
      await expect(renderCrossOrigin('use-credentials')).resolves.toBe('use-credentials');
    });

    it('sets nothing when the media element is not in CORS mode', async () => {
      await expect(renderCrossOrigin(null)).resolves.toBeNull();
    });

    it('prefers an explicit value over the inherited one', async () => {
      const attribute = await renderCrossOrigin('use-credentials', (el) => {
        el.setAttribute('crossorigin', 'anonymous');
      });

      expect(attribute).toBe('anonymous');

      const property = await renderCrossOrigin('use-credentials', (el) => {
        el.crossOrigin = 'anonymous';
      });

      expect(property).toBe('anonymous');
    });

    it('opts out of inheritance for an explicit null', async () => {
      await expect(renderCrossOrigin('anonymous', (el) => (el.crossOrigin = null))).resolves.toBeNull();
    });

    it('passes a bare crossorigin through rather than opting out', async () => {
      // The CORS-settings attribute reads an empty value as Anonymous, so it is
      // a value like any other and must not be mistaken for "no CORS".
      const attribute = await renderCrossOrigin('use-credentials', (el) => {
        el.setAttribute('crossorigin', '');
      });

      expect(attribute).toBe('');
    });

    it('does not inherit for thumbnails supplied directly', async () => {
      // Images set through the property may live anywhere, so they carry no
      // relationship to the media element's CORS mode.
      const attribute = await renderCrossOrigin('anonymous', (el) => {
        el.thumbnails = [{ url: 'https://images.example.com/sprite.jpg', startTime: 0 }];
      });

      expect(attribute).toBeNull();
    });
  });
});
