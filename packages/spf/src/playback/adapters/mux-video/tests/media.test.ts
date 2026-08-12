/**
 * SPF-backed MuxVideoMedia tests.
 *
 * Mirrors the coverage of the hls.js-backed `MuxMedia`
 * (`packages/media/src/dom/mux/tests/mux-media.test.ts`), minus everything that
 * flavor's `engine` / `preferPlayback` options carry — this source is Mux
 * identity and nothing else.
 */
import { describe, expect, it, vi } from 'vitest';
import { MuxVideoMedia } from '../media';

describe('MuxVideoMedia', () => {
  it('defaults source to null', () => {
    expect(new MuxVideoMedia().source).toBe(null);
  });

  it('derives src from source.playbackId', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123' };

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('derives src using the custom domain', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123', customDomain: 'video.example.com' };

    expect(media.src).toBe('https://stream.video.example.com/abc123.m3u8');
  });

  it('appends playback params as snake_case query params', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123', playback: { maxResolution: '720p' } };

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8?max_resolution=720p');
  });

  it('clears src when source is cleared', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123' };
    media.source = null;

    expect(media.src).toBe('');
  });

  it('parses source from a Mux stream src', () => {
    const media = new MuxVideoMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8';

    expect(media.source).toEqual({ playbackId: 'abc123' });
  });

  it('parses the custom domain and playback params from a Mux stream src', () => {
    const media = new MuxVideoMedia();
    media.src = 'https://stream.video.example.com/abc123.m3u8?max_resolution=720p';

    expect(media.source).toEqual({
      playbackId: 'abc123',
      customDomain: 'video.example.com',
      playback: { maxResolution: '720p' },
    });
  });

  it('keeps a non-Mux src as a plain source url', () => {
    const media = new MuxVideoMedia();
    media.src = 'https://example.com/stream.m3u8';

    expect(media.source).toEqual({ src: 'https://example.com/stream.m3u8' });
    expect(media.src).toBe('https://example.com/stream.m3u8');
  });

  it('plays a non-Mux source url given through source', () => {
    const media = new MuxVideoMedia();
    media.source = { src: 'https://example.com/stream.m3u8' };

    expect(media.src).toBe('https://example.com/stream.m3u8');
  });

  it('exposes the content poster and storyboard derived from source', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123' };

    expect(media.contentData).toEqual({
      poster: 'https://image.mux.com/abc123/thumbnail.webp',
      storyboard: 'https://image.mux.com/abc123/storyboard.vtt?format=webp',
    });
  });

  it('tracks source changes in the content data', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123' };
    media.source = { playbackId: 'def456' };

    expect(media.contentData.poster).toBe('https://image.mux.com/def456/thumbnail.webp');
  });

  it('has no content data without a playback id', () => {
    const media = new MuxVideoMedia();
    media.source = { src: 'https://example.com/stream.m3u8' };

    expect(media.contentData).toEqual({});
  });

  it('has no content data for signed playback without image tokens', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123', playback: { token: 'signed-playback-token' } };

    expect(media.contentData).toEqual({});
  });

  it('fires sourcechange when source is set', () => {
    const media = new MuxVideoMedia();
    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);

    media.source = { playbackId: 'abc123' };

    expect(onSourceChange).toHaveBeenCalledTimes(1);
  });

  it('ignores the same source object', () => {
    const media = new MuxVideoMedia();
    const source = { playbackId: 'abc123' };
    media.source = source;

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.source = source;

    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it('keeps the presentation when only image params change', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123' };
    const presentation = media.engine.state.presentation.get();

    // What `poster-time` does through the element: same stream, new object.
    media.source = { playbackId: 'abc123', poster: { time: 3 } };

    expect(media.contentData.poster).toBe('https://image.mux.com/abc123/thumbnail.webp?time=3');
    expect(media.engine.state.presentation.get()).toBe(presentation);
  });

  it('points unplayable-source copy at the hls.js-backed Media', () => {
    // The static exists for exactly this: SPF plays neither MPEG-TS nor DRM, and
    // the hls.js-backed Mux Media plays both. Named by flavor rather than by
    // import path, since this one Media is reached through three packages.
    expect(MuxVideoMedia.alternativeMediaSuggestion).toContain('hls-js');
    expect(MuxVideoMedia.alternativeMediaSuggestion).not.toContain('@videojs/');
  });
});
