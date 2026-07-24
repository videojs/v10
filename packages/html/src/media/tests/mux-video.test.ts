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

  it('parses the host source from the src attribute', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');

    expect(el.host.src).toBe('https://stream.mux.com/abc123.m3u8');
    expect(el.host.source).toEqual({ playbackId: 'abc123' });
  });

  it('derives the host src from the source property', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123' };

    expect(el.host.src).toBe('https://stream.mux.com/abc123.m3u8');
    expect(el.source).toEqual({ playbackId: 'abc123' });
  });

  it('applies the customDomain and playback params from the source property', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123', customDomain: 'example.com', playback: { maxResolution: '1080p' } };

    const url = new URL(el.host.src);
    expect(url.host).toBe('stream.example.com');
    expect(url.searchParams.get('max_resolution')).toBe('1080p');
  });

  it('adds a storyboard track inferred from the src attribute', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');

    const track = el.shadowRoot!.querySelector('track');
    expect(track?.kind).toBe('metadata');
    expect(track?.getAttribute('src')).toBe('https://image.mux.com/abc123/storyboard.vtt?format=webp');
  });

  it('adds a storyboard track inferred from the source property', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123', customDomain: 'example.com' };

    expect(el.shadowRoot!.querySelector('track')?.getAttribute('src')).toBe(
      'https://image.example.com/abc123/storyboard.vtt?format=webp'
    );
  });

  it('prefers the storyboard attribute over the derived URL', () => {
    const el = createMuxVideo();

    el.setAttribute('storyboard', 'https://image.mux.com/other/storyboard.vtt?token=jwt');
    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');

    expect(el.shadowRoot!.querySelector('track')?.getAttribute('src')).toBe(
      'https://image.mux.com/other/storyboard.vtt?token=jwt'
    );
  });

  it('removes the storyboard track when the src is cleared', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');
    expect(el.shadowRoot!.querySelector('track')).not.toBeNull();

    el.removeAttribute('src');
    expect(el.shadowRoot!.querySelector('track')).toBeNull();
  });

  it('does not add a storyboard track for live streams', () => {
    const el = createMuxVideo();

    el.host.streamType = 'live';
    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');

    expect(el.shadowRoot!.querySelector('track')).toBeNull();
  });

  it('removes the storyboard track when the stream becomes live', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');
    expect(el.shadowRoot!.querySelector('track')).not.toBeNull();

    el.host.streamType = 'live';
    expect(el.shadowRoot!.querySelector('track')).toBeNull();
  });

  it('exposes the effective thumbnail URL without touching the media poster', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123', thumbnail: { time: 5, ext: 'webp' } };

    expect(el.thumbnail).toBe('https://image.mux.com/abc123/thumbnail.webp?time=5');
    expect(el.shadowRoot!.querySelector('video')?.getAttribute('poster')).toBeNull();
  });
});
