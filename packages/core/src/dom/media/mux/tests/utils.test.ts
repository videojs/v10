import { describe, expect, it, vi } from 'vitest';
import { parseJwt, parseMuxVideoURL, toMuxQuery, toMuxStoryboardURL, toMuxThumbnailURL, toMuxVideoURL } from '../utils';

// Header `{"alg":"HS256"}`, body sets `aud`, empty signature.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.`;
}

describe('toMuxVideoURL', () => {
  it('returns undefined without a playbackId', () => {
    expect(toMuxVideoURL()).toBeUndefined();
    expect(toMuxVideoURL(null)).toBeUndefined();
    expect(toMuxVideoURL({ playbackId: '' })).toBeUndefined();
  });

  it('builds a stream URL from a playbackId', () => {
    expect(toMuxVideoURL({ playbackId: 'abc123' })).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('uses the custom domain', () => {
    expect(toMuxVideoURL({ playbackId: 'abc123', customDomain: 'example.com' })).toBe(
      'https://stream.example.com/abc123.m3u8'
    );
  });

  it('appends playback params as snake_case query params', () => {
    const url = new URL(
      toMuxVideoURL({
        playbackId: 'abc123',
        playback: { maxResolution: '1080p', renditionOrder: 'desc', extraParam: 'x', skip: undefined },
      })!
    );
    expect(url.searchParams.get('max_resolution')).toBe('1080p');
    expect(url.searchParams.get('rendition_order')).toBe('desc');
    expect(url.searchParams.get('extra_param')).toBe('x');
    expect(url.searchParams.has('skip')).toBe(false);
  });

  it('appends manifest modifiers as snake_case query params', () => {
    const url = new URL(
      toMuxVideoURL({
        playbackId: 'abc123',
        playback: {
          redundantStreams: true,
          rokuTrickPlay: true,
          defaultSubtitlesLang: 'en-US',
          programStartTime: 1700000000,
          programEndTime: 1700000060,
          assetStartTime: 3,
          assetEndTime: 4,
          excludePdt: true,
        },
      })!
    );
    expect(url.searchParams.get('redundant_streams')).toBe('true');
    expect(url.searchParams.get('roku_trick_play')).toBe('true');
    expect(url.searchParams.get('default_subtitles_lang')).toBe('en-US');
    expect(url.searchParams.get('program_start_time')).toBe('1700000000');
    expect(url.searchParams.get('program_end_time')).toBe('1700000060');
    expect(url.searchParams.get('asset_start_time')).toBe('3');
    expect(url.searchParams.get('asset_end_time')).toBe('4');
    expect(url.searchParams.get('exclude_pdt')).toBe('true');
  });

  it('drops all params except the token for signed playback', () => {
    const url = new URL(toMuxVideoURL({ playbackId: 'abc123', playback: { token: 'jwt', maxResolution: '1080p' } })!);
    expect(url.searchParams.get('token')).toBe('jwt');
    expect(url.searchParams.has('max_resolution')).toBe(false);
  });

  it('warns when minResolution exceeds maxResolution', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    toMuxVideoURL({ playbackId: 'abc123', playback: { minResolution: '1080p', maxResolution: '720p' } });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('parseMuxVideoURL', () => {
  it('extracts the playbackId', () => {
    expect(parseMuxVideoURL('https://stream.mux.com/abc123.m3u8')).toEqual({ playbackId: 'abc123' });
  });

  it('extracts a custom domain', () => {
    expect(parseMuxVideoURL('https://stream.example.com/abc123.m3u8')).toEqual({
      playbackId: 'abc123',
      customDomain: 'example.com',
    });
  });

  it('maps snake_case query params to camelCase playback params', () => {
    expect(parseMuxVideoURL('https://stream.mux.com/abc123.m3u8?max_resolution=1080p&token=jwt')).toEqual({
      playbackId: 'abc123',
      playback: { maxResolution: '1080p', token: 'jwt' },
    });
  });

  it('returns undefined for non-Mux URLs', () => {
    expect(parseMuxVideoURL('')).toBeUndefined();
    expect(parseMuxVideoURL('not a url')).toBeUndefined();
    expect(parseMuxVideoURL('https://example.com/video.m3u8')).toBeUndefined();
    expect(parseMuxVideoURL('https://stream.mux.com/abc123/highest.mp4')).toBeUndefined();
  });

  it('round-trips through toMuxVideoURL', () => {
    const src = 'https://stream.example.com/abc123.m3u8?asset_start_time=3&max_resolution=1080p';
    expect(toMuxVideoURL(parseMuxVideoURL(src))).toBe(src);
  });
});

describe('toMuxQuery', () => {
  it('maps camelCase keys to snake_case and skips nullish values', () => {
    expect(toMuxQuery({ assetStartTime: 1, b: undefined, c: null, d: 'x' })).toBe('?asset_start_time=1&d=x');
  });

  it('returns an empty string when there are no params', () => {
    expect(toMuxQuery({ a: undefined })).toBe('');
    expect(toMuxQuery()).toBe('');
  });

  it('keeps only the token when one is set', () => {
    expect(toMuxQuery({ token: 'jwt', assetStartTime: 1 })).toBe('?token=jwt');
  });
});

describe('toMuxThumbnailURL', () => {
  it('builds a thumbnail URL with params', () => {
    expect(toMuxThumbnailURL({ playbackId: 'abc123', thumbnail: { time: 5, ext: 'jpg' } })).toBe(
      'https://image.mux.com/abc123/thumbnail.jpg?time=5'
    );
  });

  it('defaults the extension to webp', () => {
    expect(toMuxThumbnailURL({ playbackId: 'abc123' })).toBe('https://image.mux.com/abc123/thumbnail.webp');
  });

  it('uses the first entry of a thumbnail array', () => {
    expect(toMuxThumbnailURL({ playbackId: 'abc123', thumbnail: [{ ext: 'webp' }, { ext: 'jpg' }] })).toBe(
      'https://image.mux.com/abc123/thumbnail.webp'
    );
  });

  it('appends transformation modifiers as snake_case query params', () => {
    const url = new URL(
      toMuxThumbnailURL({
        playbackId: 'abc123',
        thumbnail: {
          time: 5,
          width: 640,
          height: 360,
          rotate: 90,
          fitMode: 'smartcrop',
          flipV: true,
          flipH: true,
          programTime: 1700000000,
          latest: true,
        },
      })!
    );
    expect(url.searchParams.get('time')).toBe('5');
    expect(url.searchParams.get('width')).toBe('640');
    expect(url.searchParams.get('height')).toBe('360');
    expect(url.searchParams.get('rotate')).toBe('90');
    expect(url.searchParams.get('fit_mode')).toBe('smartcrop');
    expect(url.searchParams.get('flip_v')).toBe('true');
    expect(url.searchParams.get('flip_h')).toBe('true');
    expect(url.searchParams.get('program_time')).toBe('1700000000');
    expect(url.searchParams.get('latest')).toBe('true');
  });

  it('uses explicit params over the source thumbnail', () => {
    expect(toMuxThumbnailURL({ playbackId: 'abc123', thumbnail: { ext: 'webp' } }, { ext: 'jpg', time: 2 })).toBe(
      'https://image.mux.com/abc123/thumbnail.jpg?time=2'
    );
  });

  it('keeps only the token when one is set', () => {
    const token = fakeJwt({ aud: 't' });
    const url = new URL(toMuxThumbnailURL({ playbackId: 'abc123', thumbnail: { token, time: 5 } })!);
    expect(url.pathname).toBe('/abc123/thumbnail.webp');
    expect(url.searchParams.get('token')).toBe(token);
    expect(url.searchParams.has('time')).toBe(false);
  });

  it('returns undefined for a token with the wrong audience', () => {
    expect(toMuxThumbnailURL({ playbackId: 'abc123', thumbnail: { token: fakeJwt({ aud: 's' }) } })).toBeUndefined();
  });

  it('returns undefined for signed playback without a thumbnail token', () => {
    expect(toMuxThumbnailURL({ playbackId: 'abc123', playback: { token: 'jwt' } })).toBeUndefined();
  });

  it('returns undefined without a playbackId', () => {
    expect(toMuxThumbnailURL()).toBeUndefined();
    expect(toMuxThumbnailURL({ playbackId: '' })).toBeUndefined();
  });
});

describe('toMuxStoryboardURL', () => {
  it('builds a storyboard URL', () => {
    expect(toMuxStoryboardURL({ playbackId: 'abc123' })).toBe(
      'https://image.mux.com/abc123/storyboard.vtt?format=webp'
    );
  });

  it('uses the custom domain', () => {
    expect(toMuxStoryboardURL({ playbackId: 'abc123', customDomain: 'example.com' })).toBe(
      'https://image.example.com/abc123/storyboard.vtt?format=webp'
    );
  });

  it('keeps only the token when one is set', () => {
    const token = fakeJwt({ aud: 's' });
    const url = new URL(toMuxStoryboardURL({ playbackId: 'abc123', storyboard: { token } })!);
    expect(url.pathname).toBe('/abc123/storyboard.vtt');
    expect(url.searchParams.get('token')).toBe(token);
    expect(url.searchParams.has('format')).toBe(false);
  });

  it('returns undefined without a playbackId', () => {
    expect(toMuxStoryboardURL()).toBeUndefined();
    expect(toMuxStoryboardURL({ playbackId: '' })).toBeUndefined();
  });

  it('returns undefined for a token with the wrong audience', () => {
    expect(toMuxStoryboardURL({ playbackId: 'abc123', storyboard: { token: fakeJwt({ aud: 't' }) } })).toBeUndefined();
  });

  it('returns undefined for signed playback without a storyboard token', () => {
    expect(toMuxStoryboardURL({ playbackId: 'abc123', playback: { token: 'jwt' } })).toBeUndefined();
  });
});

describe('parseJwt', () => {
  it('decodes a token payload', () => {
    expect(parseJwt(fakeJwt({ aud: 'v', sub: 'abc' }))).toMatchObject({ aud: 'v', sub: 'abc' });
  });

  it('returns undefined for invalid tokens', () => {
    expect(parseJwt(undefined)).toBeUndefined();
    expect(parseJwt('')).toBeUndefined();
    expect(parseJwt('not-a-jwt')).toBeUndefined();
  });
});
