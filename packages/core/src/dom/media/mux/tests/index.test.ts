import { afterEach, describe, expect, it, vi } from 'vitest';
import { MuxMediaDelegate, toMuxVideoURL } from '..';
import { MaxResolution, MinResolution, RenditionOrder } from '../types';

describe('MuxMediaDelegate', () => {
  it('defaults playbackId to null', () => {
    const delegate = new MuxMediaDelegate();
    expect(delegate.playbackId).toBeNull();
  });

  it('defaults customDomain to mux.com', () => {
    const delegate = new MuxMediaDelegate();
    expect(delegate.customDomain).toBe('mux.com');
  });

  it('sets src when playbackId is set', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';

    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('uses customDomain in the generated src', () => {
    const delegate = new MuxMediaDelegate();
    delegate.customDomain = 'example.com';
    delegate.playbackId = 'abc123';

    expect(delegate.src).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('updates src when customDomain changes after playbackId', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');

    delegate.customDomain = 'custom.tv';
    expect(delegate.src).toBe('https://stream.custom.tv/abc123.m3u8');
  });

  it('falls back to default domain when customDomain is set to empty', () => {
    const delegate = new MuxMediaDelegate();
    delegate.customDomain = 'custom.tv';
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.custom.tv/abc123.m3u8');

    delegate.customDomain = '';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('does not update src when playbackId is set to the same value', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');

    delegate.src = 'https://override.example.com/video.m3u8';
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://override.example.com/video.m3u8');
  });

  it('does not trigger syncSrc when customDomain is set to empty while already default', () => {
    const delegate = new MuxMediaDelegate();
    delegate.playbackId = 'abc123';
    expect(delegate.src).toBe('https://stream.mux.com/abc123.m3u8');

    delegate.src = 'https://override.example.com/video.m3u8';
    delegate.customDomain = '';
    expect(delegate.src).toBe('https://override.example.com/video.m3u8');
  });

  it('clears src when playbackId is null and customDomain changes', () => {
    const delegate = new MuxMediaDelegate();
    delegate.src = 'https://manual.example.com/video.m3u8';
    delegate.customDomain = 'custom.tv';

    expect(delegate.src).toBe('');
  });
});

describe('toMuxVideoURL', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns undefined when playbackId is missing', () => {
    expect(toMuxVideoURL()).toBeUndefined();
    expect(toMuxVideoURL({})).toBeUndefined();
  });

  it('returns undefined when playbackId is null', () => {
    expect(toMuxVideoURL({ playbackId: null })).toBeUndefined();
  });

  it('returns undefined when playbackId is an empty string', () => {
    expect(toMuxVideoURL({ playbackId: '' })).toBeUndefined();
  });

  it('uses customDomain in the hostname', () => {
    const url = toMuxVideoURL({
      playbackId: 'abc123',
      customDomain: 'example.com',
    });
    expect(url).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('preserves query string from playbackId in public (non-token) mode', () => {
    const href = toMuxVideoURL({
      playbackId: 'abc123?foo=bar',
    });
    const parsed = new URL(href!);
    expect(parsed.hostname).toBe('stream.mux.com');
    expect(parsed.pathname).toBe('/abc123.m3u8');
    expect(parsed.searchParams.get('foo')).toBe('bar');
  });

  it('accepts tokens.playback as an alias for playbackToken', () => {
    const url = toMuxVideoURL({
      playbackId: 'abc123?noise=1',
      tokens: { playback: 'from-tokens' },
    });
    expect(url).toBe('https://stream.mux.com/abc123.m3u8?token=from-tokens');
  });

  it('keeps only token from the URL when token is present in the playback id and no override is passed', () => {
    const url = toMuxVideoURL({
      playbackId: 'abc123?token=embedded&other=strip',
    });
    expect(url).toBe('https://stream.mux.com/abc123.m3u8?token=embedded');
  });

  it('removes every non-token query param when a playback token is set (no iterator skip)', () => {
    const url = toMuxVideoURL({
      playbackId: 'abc123?a=1&b=2&c=3&d=4',
      playbackToken: 'signed-token',
    });
    expect(url).toBe('https://stream.mux.com/abc123.m3u8?token=signed-token');
  });

  it('does not add public-only params when a playback token is set', () => {
    const href = toMuxVideoURL({
      playbackId: 'abc123',
      playbackToken: 'tok',
      maxResolution: MaxResolution.upTo720p,
      programStartTime: 10,
      extraSourceParams: { custom: 'x' },
    });
    const parsed = new URL(href!);
    expect(parsed.searchParams.get('token')).toBe('tok');
    expect(parsed.searchParams.has('max_resolution')).toBe(false);
    expect(parsed.searchParams.has('program_start_time')).toBe(false);
    expect(parsed.searchParams.has('custom')).toBe(false);
  });

  it('sets max_resolution, min_resolution, and rendition_order in public mode', () => {
    const href = toMuxVideoURL({
      playbackId: 'abc123',
      maxResolution: MaxResolution.upTo1080p,
      minResolution: MinResolution.noLessThan720p,
      renditionOrder: RenditionOrder.DESCENDING,
    });
    const parsed = new URL(href!);
    expect(parsed.searchParams.get('max_resolution')).toBe('1080p');
    expect(parsed.searchParams.get('min_resolution')).toBe('720p');
    expect(parsed.searchParams.get('rendition_order')).toBe('desc');
  });

  it('includes program_start_time when the value is 0', () => {
    const url = toMuxVideoURL({
      playbackId: 'abc123',
      programStartTime: 0,
    });
    expect(url).toBe('https://stream.mux.com/abc123.m3u8?program_start_time=0');
  });

  it('includes program_end_time, asset_start_time, and asset_end_time when the value is 0', () => {
    const href = toMuxVideoURL({
      playbackId: 'abc123',
      programEndTime: 0,
      assetStartTime: 0,
      assetEndTime: 0,
    });
    const parsed = new URL(href!);
    expect(parsed.searchParams.get('program_end_time')).toBe('0');
    expect(parsed.searchParams.get('asset_start_time')).toBe('0');
    expect(parsed.searchParams.get('asset_end_time')).toBe('0');
  });

  it('merges extraSourceParams and skips nullish values', () => {
    const href = toMuxVideoURL({
      playbackId: 'abc123',
      extraSourceParams: {
        kept: '1',
        omitted: null,
        alsoOmitted: undefined,
        flag: true,
      },
    });
    const parsed = new URL(href!);
    expect(parsed.searchParams.get('kept')).toBe('1');
    expect(parsed.searchParams.get('flag')).toBe('true');
    expect(parsed.searchParams.has('omitted')).toBe(false);
    expect(parsed.searchParams.has('alsoOmitted')).toBe(false);
  });

  it('logs when minResolution is greater than maxResolution', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    toMuxVideoURL({
      playbackId: 'abc123',
      maxResolution: MaxResolution.upTo720p,
      minResolution: MinResolution.noLessThan1080p,
    });
    expect(spy).toHaveBeenCalled();
  });
});
