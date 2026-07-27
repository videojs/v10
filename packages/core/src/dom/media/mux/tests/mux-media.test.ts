import { describe, expect, it, vi } from 'vitest';
import { HlsJsMedia } from '../../hls-js';
import { MuxMedia } from '..';

describe('MuxMedia', () => {
  it('extends HlsJsMedia', () => {
    expect(new MuxMedia()).toBeInstanceOf(HlsJsMedia);
  });

  it('defaults source to null', () => {
    expect(new MuxMedia().source).toBeNull();
  });

  it('derives src from source.playbackId', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('clears src when source is cleared', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };
    media.source = null;

    expect(media.src).toBe('');
  });

  it('derives src using the custom domain', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', customDomain: 'example.com' };

    expect(media.src).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('appends playback params as snake_case query params', () => {
    const media = new MuxMedia();
    media.source = {
      playbackId: 'abc123',
      playback: {
        maxResolution: '1080p',
        minResolution: '480p',
        renditionOrder: 'desc',
        assetStartTime: 3,
        assetEndTime: 4,
        customParam: 'x',
      },
    };

    const url = new URL(media.src);
    expect(url.searchParams.get('max_resolution')).toBe('1080p');
    expect(url.searchParams.get('min_resolution')).toBe('480p');
    expect(url.searchParams.get('rendition_order')).toBe('desc');
    expect(url.searchParams.get('asset_start_time')).toBe('3');
    expect(url.searchParams.get('asset_end_time')).toBe('4');
    expect(url.searchParams.get('custom_param')).toBe('x');
  });

  it('applies a playback token and drops all other playback params', () => {
    const media = new MuxMedia();
    media.source = {
      playbackId: 'abc123',
      playback: { token: 'jwt', maxResolution: '1080p', assetStartTime: 3 },
    };

    const url = new URL(media.src);
    expect(url.searchParams.get('token')).toBe('jwt');
    expect(url.searchParams.has('max_resolution')).toBe(false);
    expect(url.searchParams.has('asset_start_time')).toBe(false);
  });

  it('parses source from a Mux stream src', () => {
    const media = new MuxMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8';

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
    expect(media.source).toEqual({ playbackId: 'abc123' });
  });

  it('parses the custom domain and playback params from a Mux stream src', () => {
    const media = new MuxMedia();
    media.src = 'https://stream.example.com/abc123.m3u8?token=jwt';

    expect(media.source).toEqual({
      playbackId: 'abc123',
      customDomain: 'example.com',
      playback: { token: 'jwt' },
    });
  });

  it('passes non-Mux src through with a null source', () => {
    const media = new MuxMedia();
    media.src = 'https://example.com/custom.m3u8';

    expect(media.src).toBe('https://example.com/custom.m3u8');
    expect(media.source).toBeNull();
  });

  it('derives the thumbnail URL from source', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', thumbnail: { time: 5, ext: 'jpg' } };

    expect(media.thumbnail).toBe('https://image.mux.com/abc123/thumbnail.jpg?time=5');
  });

  it('uses the first entry when source.thumbnail is an array', () => {
    const media = new MuxMedia();
    media.source = {
      playbackId: 'abc123',
      thumbnail: [
        { time: 5, ext: 'webp' },
        { time: 5, ext: 'jpg' },
      ],
    };

    expect(media.thumbnail).toBe('https://image.mux.com/abc123/thumbnail.webp?time=5');
  });

  it('prefers an explicitly set thumbnail URL', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };
    media.thumbnail = 'https://image.mux.com/other/thumbnail.webp';

    expect(media.thumbnail).toBe('https://image.mux.com/other/thumbnail.webp');
  });

  it('derives the storyboard URL from source', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };

    expect(media.storyboard).toBe('https://image.mux.com/abc123/storyboard.vtt?format=webp');
  });

  it('prefers an explicitly set storyboard URL', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };
    media.storyboard = 'https://image.mux.com/other/storyboard.vtt';

    expect(media.storyboard).toBe('https://image.mux.com/other/storyboard.vtt');
  });

  it('returns no storyboard for signed playback without a storyboard token', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', playback: { token: 'jwt' } };

    expect(media.storyboard).toBe('');
  });

  it('fires sourcechange when source is set', () => {
    const media = new MuxMedia();
    const onSourceChange = vi.fn(() => media.source);
    media.addEventListener('sourcechange', onSourceChange);

    media.source = { playbackId: 'abc123' };

    expect(onSourceChange).toHaveBeenCalledTimes(1);
    // The new source is readable when the event fires.
    expect(onSourceChange).toHaveReturnedWith({ playbackId: 'abc123' });

    media.source = null;

    expect(onSourceChange).toHaveBeenCalledTimes(2);
  });

  it('does not fire sourcechange for the same source reference', () => {
    const media = new MuxMedia();
    const source = { playbackId: 'abc123' };
    media.source = source;

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.source = source;

    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it('does not fire sourcechange for a structurally equal source', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', playback: { maxResolution: '1080p' } };

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.source = { playbackId: 'abc123', playback: { maxResolution: '1080p' } };

    expect(onSourceChange).not.toHaveBeenCalled();

    media.source = { playbackId: 'abc123', playback: { maxResolution: '720p' } };

    expect(onSourceChange).toHaveBeenCalledTimes(1);
  });

  it('parses typed playback params from a Mux stream src', () => {
    const media = new MuxMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8?asset_start_time=3&redundant_streams=true';

    expect(media.source).toEqual({
      playbackId: 'abc123',
      playback: { assetStartTime: 3, redundantStreams: true },
    });
  });

  it('fires sourcechange when a Mux stream src is parsed', () => {
    const media = new MuxMedia();
    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);

    media.src = 'https://stream.mux.com/abc123.m3u8';

    expect(onSourceChange).toHaveBeenCalledTimes(1);
  });

  it('does not fire sourcechange when a non-Mux src replaces another', () => {
    const media = new MuxMedia();
    media.src = 'https://example.com/a.m3u8';

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.src = 'https://example.com/b.m3u8';

    expect(onSourceChange).not.toHaveBeenCalled();
  });
});
