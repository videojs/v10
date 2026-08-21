import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GifVideo } from '../gif-video/media';

let tagCounter = 0;

function defineGifVideo(): string {
  const tag = `test-gif-video-${tagCounter++}`;
  customElements.define(tag, class extends GifVideo {});
  return tag;
}

beforeEach(() => {
  // Keep the fetch a `src` kicks off pending; these tests cover the element
  // wiring, not the decode pipeline.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<never>(() => {}))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GifVideo', () => {
  it('renders a canvas into the shadow root', () => {
    const tag = defineGifVideo();
    const element = document.createElement(tag);

    const canvas = element.shadowRoot?.querySelector('canvas');
    expect(canvas).not.toBe(null);
    expect(canvas?.getAttribute('part')).toBe('canvas');
  });

  it('forwards src to the media host and starts a fetch', () => {
    const tag = defineGifVideo();
    const element = document.createElement(tag) as HTMLElement & { src: string };

    element.setAttribute('src', 'https://example.com/animated.gif');

    expect(element.src).toBe('https://example.com/animated.gif');
    expect(fetch).toHaveBeenCalledWith('https://example.com/animated.gif', expect.anything());
  });

  it('exposes the media surface through the element', () => {
    const tag = defineGifVideo();
    const element = document.createElement(tag) as HTMLElement & {
      paused: boolean;
      canPlayType: (type: string) => string;
    };

    expect(element.paused).toBe(true);
    expect(element.canPlayType('image/gif')).toBe('probably');
    expect(element.canPlayType('video/mp4')).toBe('');
  });
});
