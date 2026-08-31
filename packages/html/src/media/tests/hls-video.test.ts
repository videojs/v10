import { afterEach, describe, expect, it } from 'vite-plus/test';

import { HlsVideo } from '../hls-video';

customElements.define('test-hls-video', HlsVideo);

function createHlsVideo() {
  const el = new HlsVideo();

  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// EXPLORATION (see #2573): pins the end-to-end wiring — the element's injected property config routes the
// adapter-owned members straight to the SPF media, while their attributes stay input channels for markup.
describe('HlsVideo', () => {
  it('sends streamType property writes to the adapter directly, without attribute reflection', () => {
    const el = createHlsVideo();

    el.streamType = 'on-demand';

    // The adapter pins the consumer override and reports it back.
    expect(el.streamType).toBe('on-demand');

    // The write never routed through the attribute.
    expect(el.hasAttribute('stream-type')).toBe(false);
  });

  it('still accepts streamType from markup as an input channel', () => {
    const el = createHlsVideo();

    el.setAttribute('stream-type', 'live');

    expect(el.streamType).toBe('live');
  });

  it('delivers disableRemotePlayback writes the attribute cannot represent', () => {
    const el = createHlsVideo();

    // Attribute absent, assigning false: under attribute-sourced wiring this write would be coalesced away before
    // reaching the adapter. Direct wiring delivers it, and the attribute stays untouched.
    el.disableRemotePlayback = false;

    expect(el.disableRemotePlayback).toBe(false);
    expect(el.hasAttribute('disableremoteplayback')).toBe(false);
  });
});
