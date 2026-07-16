import { describe, expect, it, vi } from 'vitest';
import { toMuxVideoURL, toPlaybackIdParts } from '../utils';

describe('toMuxVideoURL', () => {
  it('returns undefined without a playbackId', () => {
    expect(toMuxVideoURL()).toBeUndefined();
    expect(toMuxVideoURL({})).toBeUndefined();
  });

  it('builds a stream URL from a playbackId', () => {
    expect(toMuxVideoURL({ playbackId: 'abc123' })).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('uses the custom domain', () => {
    expect(toMuxVideoURL({ playbackId: 'abc123', customDomain: 'example.com' })).toBe(
      'https://stream.example.com/abc123.m3u8'
    );
  });

  it('appends resolution and rendition params', () => {
    const url = new URL(toMuxVideoURL({ playbackId: 'abc123', maxResolution: '1080p', renditionOrder: 'desc' })!);
    expect(url.searchParams.get('max_resolution')).toBe('1080p');
    expect(url.searchParams.get('rendition_order')).toBe('desc');
  });

  it('appends extra source params and skips nullish values', () => {
    const url = new URL(toMuxVideoURL({ playbackId: 'abc123', extraSourceParams: { foo: 'bar', skip: undefined } })!);
    expect(url.searchParams.get('foo')).toBe('bar');
    expect(url.searchParams.has('skip')).toBe(false);
  });

  it('drops all params except the token for signed playback', () => {
    const url = new URL(toMuxVideoURL({ playbackId: 'abc123?foo=bar', playbackToken: 'jwt', maxResolution: '1080p' })!);
    expect(url.searchParams.get('token')).toBe('jwt');
    expect(url.searchParams.has('foo')).toBe(false);
    expect(url.searchParams.has('max_resolution')).toBe(false);
  });

  it('warns when minResolution exceeds maxResolution', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    toMuxVideoURL({ playbackId: 'abc123', minResolution: '1080p', maxResolution: '720p' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('toPlaybackIdParts', () => {
  it('splits an id with query params', () => {
    expect(toPlaybackIdParts('abc123?token=jwt')).toEqual(['abc123', '?token=jwt']);
  });

  it('returns only the id when there are no params', () => {
    expect(toPlaybackIdParts('abc123')).toEqual(['abc123']);
  });
});
