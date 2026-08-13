import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MuxBackgroundVideo } from '../../mux-background-video';
import { HlsBackgroundVideo } from '../index';

beforeEach(() => {
  // The engine seeds `loadActivated: true`, so assigning `src` starts fetching
  // the manifest at once. Stubbed so these stay offline and leave no request
  // pending at teardown.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline')))
  );
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

let tagCounter = 0;

function defineElement() {
  const tag = `test-hls-background-video-${++tagCounter}`;
  customElements.define(tag, class extends HlsBackgroundVideo {});
  return tag;
}

// innerHTML on a connected container so attributes are present when the constructor runs.
function create(tag: string, attrs: Record<string, string> = {}): HlsBackgroundVideo {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
    .join('');
  container.innerHTML = `<${tag}${attrStr}></${tag}>`;
  return container.querySelector(tag) as HlsBackgroundVideo;
}

describe('HlsBackgroundVideo', () => {
  it('renders a video into its shadow root', () => {
    const element = create(defineElement());

    expect(element.video).toBeInstanceOf(HTMLVideoElement);
  });

  it('forces the ambient playback attributes onto the inner video', () => {
    // The whole point of the element: no nomuted/noloop/noautoplay opt-outs.
    const { video } = create(defineElement());

    expect(video?.hasAttribute('muted')).toBe(true);
    expect(video?.hasAttribute('loop')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    // Set as a property too — an attribute set post-createElement doesn't take,
    // and without it autoplay is refused.
    expect(video?.muted).toBe(true);
  });

  it('reads src from the attribute', () => {
    const element = create(defineElement(), { src: 'https://example.com/v.m3u8' });

    expect(element.src).toBe('https://example.com/v.m3u8');
  });

  it('tracks src when the attribute changes', () => {
    const element = create(defineElement(), { src: 'https://example.com/v.m3u8' });
    element.setAttribute('src', 'https://example.com/v2.m3u8');

    expect(element.src).toBe('https://example.com/v2.m3u8');
  });

  it('clears src when the attribute is removed', () => {
    const element = create(defineElement(), { src: 'https://example.com/v.m3u8' });
    element.removeAttribute('src');

    expect(element.src).toBe('');
  });

  it('keeps the params that narrow the manifest', () => {
    // Capping is a query param rather than an attribute, so it has to survive
    // the round trip through the element untouched.
    const src = 'https://stream.mux.com/PLAYBACK_ID.m3u8?max_resolution=720p';
    const element = create(defineElement(), { src });

    expect(element.src).toBe(src);
  });

  it('observes only src', () => {
    // `max-resolution` is a URL param, `preload` means nothing to an engine that
    // loads immediately, and `audio` / `debug` from the package this replaces are
    // gone for good.
    expect(HlsBackgroundVideo.observedAttributes).toEqual(['src']);
  });

  it('is what <mux-background-video> resolves to', () => {
    // An alias, so there is one implementation to test rather than two.
    expect(MuxBackgroundVideo).toBe(HlsBackgroundVideo);
  });
});
