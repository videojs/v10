import { getComponents } from '@videojs/core/dom/media/media-host';
import { MuxData } from '@videojs/core/dom/media/mux';
import { afterEach, describe, expect, it } from 'vitest';
import { MuxVideo } from '../mux-video';

customElements.define('test-mux-video', MuxVideo);

function createMuxVideo() {
  const el = new MuxVideo();
  // Prevent the real Mux SDK from initializing (and beaconing) in tests.
  el.config = { muxData: { MuxDataSdk: undefined } };
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MuxVideo', () => {
  it('constructs the mux data component with the player software name', () => {
    const el = createMuxVideo();
    const muxData = getComponents(el.host).get(MuxData);

    expect(muxData).toBeInstanceOf(MuxData);
    expect(muxData?.playerSoftwareName).toBe('mux-video');
  });

  it('exposes the element config as plain values, not the component instance', () => {
    const el = createMuxVideo();

    // `config` reflects exactly what was set — a plain namespace bag.
    expect(el.config.muxData).toEqual({ MuxDataSdk: undefined });
    expect(el.config.muxData).not.toBeInstanceOf(MuxData);
  });

  it('routes component config writes to the component', () => {
    const el = createMuxVideo();
    const muxData = getComponents(el.host).get(MuxData);

    el.config = { muxData: { envKey: 'test-key' } };

    // The write reached the live component...
    expect(muxData?.envKey).toBe('test-key');
    // ...and config reads back the plain value, not the instance.
    expect(el.config.muxData?.envKey).toBe('test-key');
    expect(el.hasAttribute('config')).toBe(false);
  });

  it('derives the host src from the playback-id attribute', () => {
    const el = createMuxVideo();

    el.setAttribute('playback-id', 'abc123');

    expect(el.playbackId).toBe('abc123');
    expect(el.host.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('derives the host src from the playbackId property', () => {
    const el = createMuxVideo();

    el.playbackId = 'abc123';

    expect(el.getAttribute('playback-id')).toBe('abc123');
    expect(el.host.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('applies the custom-domain and max-resolution modifiers', () => {
    const el = createMuxVideo();

    el.setAttribute('custom-domain', 'example.com');
    el.setAttribute('max-resolution', '1080p');
    el.setAttribute('playback-id', 'abc123');

    const url = new URL(el.host.src);
    expect(url.host).toBe('stream.example.com');
    expect(url.searchParams.get('max_resolution')).toBe('1080p');
  });

  it('adds a storyboard track inferred from the playback-id', () => {
    const el = createMuxVideo();

    el.setAttribute('playback-id', 'abc123');

    const track = el.shadowRoot!.querySelector('track');
    expect(track?.kind).toBe('metadata');
    expect(track?.getAttribute('src')).toBe('https://image.mux.com/abc123/storyboard.vtt?format=webp');
  });

  it('uses the custom domain for the storyboard track', () => {
    const el = createMuxVideo();

    el.setAttribute('custom-domain', 'example.com');
    el.setAttribute('playback-id', 'abc123');

    expect(el.shadowRoot!.querySelector('track')?.getAttribute('src')).toBe(
      'https://image.example.com/abc123/storyboard.vtt?format=webp'
    );
  });

  it('removes the storyboard track when the playback-id is cleared', () => {
    const el = createMuxVideo();

    el.setAttribute('playback-id', 'abc123');
    expect(el.shadowRoot!.querySelector('track')).not.toBeNull();

    el.removeAttribute('playback-id');
    expect(el.shadowRoot!.querySelector('track')).toBeNull();
  });

  it('does not add a storyboard track for live streams', () => {
    const el = createMuxVideo();

    el.host.streamType = 'live';
    el.setAttribute('playback-id', 'abc123');

    expect(el.shadowRoot!.querySelector('track')).toBeNull();
  });

  it('removes the storyboard track when the stream becomes live', () => {
    const el = createMuxVideo();

    el.setAttribute('playback-id', 'abc123');
    expect(el.shadowRoot!.querySelector('track')).not.toBeNull();

    el.host.streamType = 'live';
    expect(el.shadowRoot!.querySelector('track')).toBeNull();
  });
});
