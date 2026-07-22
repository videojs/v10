import { describe, expect, it } from 'vitest';
import { HlsJsMedia } from '../../hls-js';
import { MuxMedia } from '..';

describe('MuxMedia', () => {
  it('extends HlsJsMedia', () => {
    expect(new MuxMedia()).toBeInstanceOf(HlsJsMedia);
  });

  it('defaults playbackId to an empty string', () => {
    expect(new MuxMedia().playbackId).toBe('');
  });

  it('derives src from playbackId', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';

    expect(media.playbackId).toBe('abc123');
    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('clears src when playbackId is cleared', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.playbackId = '';

    expect(media.src).toBe('');
  });

  it('ignores setting the same playbackId', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.src = 'https://example.com/custom.m3u8';
    media.playbackId = 'abc123';

    expect(media.src).toBe('https://example.com/custom.m3u8');
  });

  it('defaults customDomain to mux.com', () => {
    expect(new MuxMedia().customDomain).toBe('mux.com');
  });

  it('derives src using the custom domain', () => {
    const media = new MuxMedia();
    media.customDomain = 'example.com';
    media.playbackId = 'abc123';

    expect(media.src).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('re-derives src when customDomain changes after playbackId is set', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.customDomain = 'example.com';

    expect(media.src).toBe('https://stream.example.com/abc123.m3u8');
  });

  it('falls back to mux.com when customDomain is cleared', () => {
    const media = new MuxMedia();
    media.customDomain = 'example.com';
    media.customDomain = '';
    media.playbackId = 'abc123';

    expect(media.customDomain).toBe('mux.com');
    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('appends resolution and rendition modifiers to src', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.maxResolution = '1080p';
    media.minResolution = '480p';
    media.renditionOrder = 'desc';

    const url = new URL(media.src);
    expect(url.searchParams.get('max_resolution')).toBe('1080p');
    expect(url.searchParams.get('min_resolution')).toBe('480p');
    expect(url.searchParams.get('rendition_order')).toBe('desc');
  });

  it('appends program and asset time modifiers to src', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.programStartTime = 1;
    media.programEndTime = 2;
    media.assetStartTime = 3;
    media.assetEndTime = 4;

    const url = new URL(media.src);
    expect(url.searchParams.get('program_start_time')).toBe('1');
    expect(url.searchParams.get('program_end_time')).toBe('2');
    expect(url.searchParams.get('asset_start_time')).toBe('3');
    expect(url.searchParams.get('asset_end_time')).toBe('4');
  });

  it('appends extra source params to src', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.extraSourceParams = { foo: 'bar' };

    expect(new URL(media.src).searchParams.get('foo')).toBe('bar');
  });

  it('applies a playback token and strips other modifiers', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.maxResolution = '1080p';
    media.playbackToken = 'jwt';

    const url = new URL(media.src);
    expect(url.searchParams.get('token')).toBe('jwt');
    expect(url.searchParams.has('max_resolution')).toBe(false);
  });

  it('re-derives src when a modifier is cleared', () => {
    const media = new MuxMedia();
    media.playbackId = 'abc123';
    media.maxResolution = '1080p';
    media.maxResolution = undefined;

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });
});
