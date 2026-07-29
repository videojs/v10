import { afterEach, describe, expect, it } from 'vitest';
import { MuxVideo } from '../mux-video';

customElements.define('test-mux-video', MuxVideo);

function createMuxVideo() {
  const el = new MuxVideo();
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MuxVideo', () => {
  it('exposes the element config as a property, not an attribute', () => {
    const el = createMuxVideo();

    el.config = { preferPlayback: 'native' };

    expect(el.config.preferPlayback).toBe('native');
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

    const track = el.querySelector('track');
    expect(track?.kind).toBe('metadata');
    expect(track?.getAttribute('src')).toBe('https://image.mux.com/abc123/storyboard.vtt?format=webp');
  });

  it('adds a storyboard track inferred from the source property', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123', customDomain: 'example.com' };

    expect(el.querySelector('track')?.getAttribute('src')).toBe(
      'https://image.example.com/abc123/storyboard.vtt?format=webp'
    );
  });

  it('prefers the storyboard attribute over the derived URL', () => {
    const el = createMuxVideo();

    el.setAttribute('storyboard', 'https://image.mux.com/other/storyboard.vtt?token=jwt');
    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');

    expect(el.querySelector('track')?.getAttribute('src')).toBe('https://image.mux.com/other/storyboard.vtt?token=jwt');
  });

  it('removes the storyboard track when the src is cleared', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');
    expect(el.querySelector('track')).not.toBeNull();

    el.removeAttribute('src');
    expect(el.querySelector('track')).toBeNull();
  });

  it('does not add a storyboard track for live streams', () => {
    const el = createMuxVideo();

    el.host.streamType = 'live';
    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');

    expect(el.querySelector('track')).toBeNull();
  });

  it('removes the storyboard track when the stream becomes live', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');
    expect(el.querySelector('track')).not.toBeNull();

    el.host.streamType = 'live';
    expect(el.querySelector('track')).toBeNull();
  });

  it('keeps a single storyboard track across source changes', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');
    el.setAttribute('src', 'https://stream.mux.com/xyz789.m3u8');

    const tracks = el.querySelectorAll('track');
    expect(tracks.length).toBe(1);
    expect(tracks[0]?.getAttribute('src')).toBe('https://image.mux.com/xyz789/storyboard.vtt?format=webp');
  });

  it('reflects the derived src to the src attribute when source is set', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123' };

    expect(el.getAttribute('src')).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('updates a stale src attribute when source replaces it', () => {
    const el = createMuxVideo();

    el.setAttribute('src', 'https://stream.mux.com/abc123.m3u8');
    el.source = { playbackId: 'xyz789' };

    expect(el.getAttribute('src')).toBe('https://stream.mux.com/xyz789.m3u8');
    expect(el.host.src).toBe('https://stream.mux.com/xyz789.m3u8');
  });

  it('removes the src attribute when the source is cleared', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123' };
    el.source = null;

    expect(el.hasAttribute('src')).toBe(false);
    expect(el.host.src).toBe('');
  });

  it('exposes the effective thumbnail URL without touching the media poster', () => {
    const el = createMuxVideo();

    el.source = { playbackId: 'abc123', thumbnail: { time: 5, ext: 'webp' } };

    expect(el.thumbnail).toBe('https://image.mux.com/abc123/thumbnail.webp?time=5');
    expect(el.shadowRoot!.querySelector('video')?.getAttribute('poster')).toBeNull();
  });
});
