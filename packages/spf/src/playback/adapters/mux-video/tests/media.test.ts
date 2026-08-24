/**
 * SPF-backed MuxVideoMedia tests.
 *
 * Mirrors the coverage of the hls.js-backed `MuxMedia` (`packages/media/src/dom/mux/tests/mux-media.test.ts`), minus
 * everything that flavor's `engine` / `preferPlayback` options carry — this source is Mux identity and nothing else.
 */
import { describe, expect, it, vi } from 'vite-plus/test';

import { resolveDrmUrl } from '../../../../media/drm';
import { createHlsVideoEngine } from '../../../engines/hls/engine';
import { MuxVideoMedia } from '../media';

// Real engine, spied construction — the DRM config a Media hands over is not
// readable back off a `Composition`, and these assertions are about what it
// passes rather than what the engine then does with it.
vi.mock('../../../engines/hls/engine', async () => {
  const actual = await vi.importActual<typeof import('../../../engines/hls/engine')>('../../../engines/hls/engine');
  return { ...actual, createHlsVideoEngine: vi.fn(actual.createHlsVideoEngine) };
});

// Header `{"alg":"HS256"}`, body sets `aud`, empty signature — unpadded
// base64url, so it survives a query string untouched.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.`;
}

/**
 * Resolve one key system's license server off the `drm` config the most recently
 * constructed Media handed the engine — which is what the engine itself would do
 * when the CDM asks.
 */
function licenseUrl(keySystem: string): string | undefined {
  const calls = vi.mocked(createHlsVideoEngine).mock.calls;
  const drm = calls[calls.length - 1]![0]!.drm!;
  return resolveDrmUrl(drm[keySystem]?.licenseUrl);
}

function serverCertificateUrl(keySystem: string): string | undefined {
  const calls = vi.mocked(createHlsVideoEngine).mock.calls;
  const drm = calls[calls.length - 1]![0]!.drm!;
  return resolveDrmUrl(drm[keySystem]?.serverCertificateUrl);
}

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

  it('dispatches `contentdatachange` when the derived urls change', () => {
    const media = new MuxVideoMedia();
    const handler = vi.fn();

    media.addEventListener('contentdatachange', handler);

    media.source = { playbackId: 'abc123' };

    expect(handler).toHaveBeenCalledTimes(1);
    expect(media.contentData.poster).toBe('https://image.mux.com/abc123/thumbnail.webp');

    media.source = { playbackId: 'xyz789' };

    expect(handler).toHaveBeenCalledTimes(2);
    expect(media.contentData.poster).toBe('https://image.mux.com/xyz789/thumbnail.webp');
  });

  it('dedupes `contentdatachange` when a source change leaves the urls alone', () => {
    const media = new MuxVideoMedia();

    media.source = { playbackId: 'abc123' };

    const handler = vi.fn();

    media.addEventListener('contentdatachange', handler);

    // A new object, so `sourcechange` still fires, but nothing the images are
    // built from moved.
    media.source = { playbackId: 'abc123', playback: { maxResolution: '720p' } };

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears the content data and announces it when the source is dropped', () => {
    const media = new MuxVideoMedia();

    media.source = { playbackId: 'abc123' };

    const handler = vi.fn();

    media.addEventListener('contentdatachange', handler);

    media.source = null;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(media.contentData).toEqual({});
  });

  it('has the content data in step when `sourcechange` fires', () => {
    const media = new MuxVideoMedia();
    const seen: (string | null | undefined)[] = [];

    media.addEventListener('sourcechange', () => seen.push(media.contentData.poster));

    media.source = { playbackId: 'abc123' };

    expect(seen).toEqual(['https://image.mux.com/abc123/thumbnail.webp']);
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

describe('MuxVideoMedia DRM', () => {
  const token = fakeJwt({ aud: 'd' });

  it('derives Mux license servers from a drm token', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123', drm: { token } };

    expect(licenseUrl('com.widevine.alpha')).toBe(`https://license.mux.com/license/widevine/abc123?token=${token}`);
    expect(serverCertificateUrl('com.apple.fps')).toBe(
      `https://license.mux.com/appcert/fairplay/abc123?token=${token}`
    );
  });

  it('resolves no license server for a source carrying no DRM', () => {
    const media = new MuxVideoMedia();
    media.source = { playbackId: 'abc123' };

    // What makes an encrypted rendition prune rather than negotiate: every key
    // system is named, none resolves.
    expect(licenseUrl('com.widevine.alpha')).toBeUndefined();
    expect(licenseUrl('com.apple.fps')).toBeUndefined();
    expect(licenseUrl('com.microsoft.playready')).toBeUndefined();
  });

  it('prefers a license server the source names outright over the derived one', () => {
    const media = new MuxVideoMedia();
    media.source = {
      playbackId: 'abc123',
      drm: { token, 'com.widevine.alpha': { licenseUrl: 'https://license.example.com/widevine' } },
    };

    expect(licenseUrl('com.widevine.alpha')).toBe('https://license.example.com/widevine');
    // Systems it doesn't name still come from the token.
    expect(licenseUrl('com.microsoft.playready')).toBe(
      `https://license.mux.com/license/playready/abc123?token=${token}`
    );
  });

  it('follows the source without rebuilding the engine', () => {
    const media = new MuxVideoMedia();
    const before = vi.mocked(createHlsVideoEngine).mock.calls.length;

    media.source = { playbackId: 'abc123', drm: { token } };
    expect(licenseUrl('com.widevine.alpha')).toBe(`https://license.mux.com/license/widevine/abc123?token=${token}`);

    media.source = { playbackId: 'def456', drm: { token } };
    expect(licenseUrl('com.widevine.alpha')).toBe(`https://license.mux.com/license/widevine/def456?token=${token}`);

    media.source = null;
    expect(licenseUrl('com.widevine.alpha')).toBeUndefined();

    expect(vi.mocked(createHlsVideoEngine).mock.calls.length).toBe(before);
  });
});
