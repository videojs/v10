/**
 * SPF-backed MuxVideoAdapter tests.
 *
 * Mirrors the coverage of the hls.js-backed `MuxVideoAdapter`
 * (`packages/adapters/mux-video/src/tests/adapter.test.ts`), minus everything that flavor's `engine` / `preferPlayback`
 * options carry — this source is Mux identity and nothing else.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { resolveDrmUrl } from '@videojs/spf/drm';
import { createHlsVideoEngine } from '@videojs/spf/hls';

import { MuxVideoAdapter } from '../adapter';

// Real engine, spied construction — the DRM config an Adapter hands over is not
// readable back off a `Composition`, and these assertions are about what it
// passes rather than what the engine then does with it.
vi.mock('@videojs/spf/hls', async () => {
  const actual = await vi.importActual<typeof import('@videojs/spf/hls')>('@videojs/spf/hls');
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
 * constructed Adapter handed the engine — which is what the engine itself would do
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

// The document Mux serves: Apple's JSON chapters, the first chapter standing
// for the asset.
const DOCUMENT = [
  {
    'start-time': 0,
    titles: [{ language: 'und', title: 'Big Buck Bunny' }],
    metadata: [{ key: 'com.mux.video.branding', value: 'mux-free-plan' }],
  },
];

function stubFetch(body: unknown = DOCUMENT, status = 200) {
  const fetchMock = vi.fn(async (_input: string | URL | Request) => new Response(JSON.stringify(body), { status }));

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

// The engine fetches the manifest through the same global; only the metadata
// requests are of interest here.
function metadataRequests(fetchMock: ReturnType<typeof stubFetch>) {
  return fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes('metadata.json'));
}

// Let a resolved fetch settle into `contentData`.
function flush() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// Every Mux source fetches its metadata, so no test here reaches the network.
beforeEach(() => {
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MuxVideoAdapter', () => {
  it('defaults source to null', () => {
    expect(new MuxVideoAdapter().source).toBe(null);
  });

  it('derives src from source.playbackId', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123' };

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8');
  });

  it('derives src using the custom domain', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123', customDomain: 'video.example.com' };

    expect(media.src).toBe('https://stream.video.example.com/abc123.m3u8');
  });

  it('appends playback params as snake_case query params', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123', playback: { maxResolution: '720p' } };

    expect(media.src).toBe('https://stream.mux.com/abc123.m3u8?max_resolution=720p');
  });

  it('clears src when source is cleared', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123' };
    media.source = null;

    expect(media.src).toBe('');
  });

  it('parses source from a Mux stream src', () => {
    const media = new MuxVideoAdapter();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    expect(media.source).toEqual({ playbackId: 'abc123' });
  });

  it('parses the custom domain and playback params from a Mux stream src', () => {
    const media = new MuxVideoAdapter();

    media.src = 'https://stream.video.example.com/abc123.m3u8?max_resolution=720p';

    expect(media.source).toEqual({
      playbackId: 'abc123',
      customDomain: 'video.example.com',
      playback: { maxResolution: '720p' },
    });
  });

  it('keeps a non-Mux src as a plain source url', () => {
    const media = new MuxVideoAdapter();

    media.src = 'https://example.com/stream.m3u8';

    expect(media.source).toEqual({ src: 'https://example.com/stream.m3u8' });
    expect(media.src).toBe('https://example.com/stream.m3u8');
  });

  it('plays a non-Mux source url given through source', () => {
    const media = new MuxVideoAdapter();

    media.source = { src: 'https://example.com/stream.m3u8' };

    expect(media.src).toBe('https://example.com/stream.m3u8');
  });

  it('exposes the content poster and storyboard derived from source', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123' };

    expect(media.contentData).toEqual({
      poster: 'https://image.mux.com/abc123/thumbnail.webp',
      storyboard: 'https://image.mux.com/abc123/storyboard.vtt?format=webp',
    });
  });

  it('tracks source changes in the content data', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123' };
    media.source = { playbackId: 'def456' };

    expect(media.contentData.poster).toBe('https://image.mux.com/def456/thumbnail.webp');
  });

  it('has no content data without a playback id', () => {
    const media = new MuxVideoAdapter();

    media.source = { src: 'https://example.com/stream.m3u8' };

    expect(media.contentData).toEqual({});
  });

  it('has no content data for signed playback without image tokens', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123', playback: { token: 'signed-playback-token' } };

    expect(media.contentData).toEqual({});
  });

  it('dispatches `contentdatachange` when the derived urls change', () => {
    const media = new MuxVideoAdapter();
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
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123' };

    const handler = vi.fn();

    media.addEventListener('contentdatachange', handler);

    // A new object, so `sourcechange` still fires, but nothing the images are
    // built from moved.
    media.source = { playbackId: 'abc123', playback: { maxResolution: '720p' } };

    expect(handler).not.toHaveBeenCalled();
  });

  it('clears the content data and announces it when the source is dropped', () => {
    const media = new MuxVideoAdapter();

    media.source = { playbackId: 'abc123' };

    const handler = vi.fn();

    media.addEventListener('contentdatachange', handler);

    media.source = null;

    expect(handler).toHaveBeenCalledTimes(1);
    expect(media.contentData).toEqual({});
  });

  it('has the content data in step when `sourcechange` fires', () => {
    const media = new MuxVideoAdapter();
    const seen: (string | null | undefined)[] = [];

    media.addEventListener('sourcechange', () => seen.push(media.contentData.poster));

    media.source = { playbackId: 'abc123' };

    expect(seen).toEqual(['https://image.mux.com/abc123/thumbnail.webp']);
  });

  it('fires sourcechange when source is set', () => {
    const media = new MuxVideoAdapter();
    const onSourceChange = vi.fn();

    media.addEventListener('sourcechange', onSourceChange);

    media.source = { playbackId: 'abc123' };

    expect(onSourceChange).toHaveBeenCalledTimes(1);
  });

  it('ignores the same source object', () => {
    const media = new MuxVideoAdapter();
    const source = { playbackId: 'abc123' };

    media.source = source;

    const onSourceChange = vi.fn();

    media.addEventListener('sourcechange', onSourceChange);
    media.source = source;

    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it('keeps the presentation when only image params change', () => {
    const media = new MuxVideoAdapter();

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
    expect(MuxVideoAdapter.alternativeMediaSuggestion).toContain('hls-js');
    expect(MuxVideoAdapter.alternativeMediaSuggestion).not.toContain('@videojs/');
  });

  describe('metadata', () => {
    it('fetches the metadata as soon as a playback id is known', async () => {
      const fetchMock = stubFetch();
      const media = new MuxVideoAdapter();
      const handler = vi.fn();

      media.addEventListener('contentdatachange', handler);
      media.source = { playbackId: 'abc123', playback: { token: 'jwt' } };

      // SPF surfaces no session data, so there is no manifest to wait on.
      expect(metadataRequests(fetchMock)).toEqual(['https://stream.mux.com/abc123/metadata.json?token=jwt']);
      expect(media.contentData.title).toBeUndefined();

      await flush();

      // Signed playback without image tokens derives no URLs, so the metadata
      // is the one change announced.
      expect(media.contentData).toEqual({
        title: 'Big Buck Bunny',
        'com.mux.video.branding': 'mux-free-plan',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not fetch for a non-Mux source', () => {
      const fetchMock = stubFetch();
      const media = new MuxVideoAdapter();

      media.source = { src: 'https://example.com/stream.m3u8' };

      expect(metadataRequests(fetchMock)).toEqual([]);
    });

    it('keeps the title when only image params change', async () => {
      const fetchMock = stubFetch();
      const media = new MuxVideoAdapter();

      media.source = { playbackId: 'abc123' };
      await flush();

      // What `poster-time` does through the element: same stream, new object.
      media.source = { playbackId: 'abc123', poster: { time: 3 } };
      await flush();

      expect(media.contentData.title).toBe('Big Buck Bunny');
      expect(media.contentData.poster).toBe('https://image.mux.com/abc123/thumbnail.webp?time=3');
      expect(metadataRequests(fetchMock)).toHaveLength(1);
    });

    it('drops the title with the playback id, before the next one loads', async () => {
      const fetchMock = stubFetch();
      const media = new MuxVideoAdapter();

      media.source = { playbackId: 'abc123' };
      await flush();

      const seen: (string | null | undefined)[] = [];

      media.addEventListener('sourcechange', () => seen.push(media.contentData.title));
      media.source = { playbackId: 'xyz789' };

      expect(seen).toEqual([undefined]);

      await flush();

      expect(metadataRequests(fetchMock)).toEqual([
        'https://stream.mux.com/abc123/metadata.json',
        'https://stream.mux.com/xyz789/metadata.json',
      ]);
      expect(media.contentData.title).toBe('Big Buck Bunny');
    });

    it('clears the title with the source', async () => {
      const media = new MuxVideoAdapter();

      media.source = { playbackId: 'abc123' };
      await flush();

      media.source = null;

      expect(media.contentData).toEqual({});
    });

    it('has no title for an asset without metadata', async () => {
      stubFetch([{ 'start-time': 0 }]);

      const media = new MuxVideoAdapter();
      const handler = vi.fn();

      media.source = { playbackId: 'abc123' };
      media.addEventListener('contentdatachange', handler);
      await flush();

      expect(media.contentData.title).toBeUndefined();
      // An empty document changes nothing, so nothing is announced.
      expect(handler).not.toHaveBeenCalled();
    });

    it('has no title when the document fails to load', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      stubFetch('', 500);

      const media = new MuxVideoAdapter();

      media.source = { playbackId: 'abc123' };
      await flush();

      expect(media.contentData.title).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('500'));
    });

    it('aborts the request in flight on destroy', () => {
      const fetchMock = vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>(() => {}));

      vi.stubGlobal('fetch', fetchMock);

      const media = new MuxVideoAdapter();

      media.source = { playbackId: 'abc123' };
      media.destroy();

      const request = fetchMock.mock.calls.find(([url]) => url.includes('metadata.json'));

      expect(request?.[1]?.signal?.aborted).toBe(true);
    });
  });
});

describe('MuxVideoAdapter DRM', () => {
  const token = fakeJwt({ aud: 'd' });

  it('derives Mux license servers from a drm token', () => {
    const media = new MuxVideoAdapter();
    media.source = { playbackId: 'abc123', drm: { token } };

    expect(licenseUrl('com.widevine.alpha')).toBe(`https://license.mux.com/license/widevine/abc123?token=${token}`);
    expect(serverCertificateUrl('com.apple.fps')).toBe(
      `https://license.mux.com/appcert/fairplay/abc123?token=${token}`
    );
  });

  it('resolves no license server for a source carrying no DRM', () => {
    const media = new MuxVideoAdapter();
    media.source = { playbackId: 'abc123' };

    // What makes an encrypted rendition prune rather than negotiate: every key
    // system is named, none resolves.
    expect(licenseUrl('com.widevine.alpha')).toBeUndefined();
    expect(licenseUrl('com.apple.fps')).toBeUndefined();
    expect(licenseUrl('com.microsoft.playready')).toBeUndefined();
  });

  it('prefers a license server the source names outright over the derived one', () => {
    const media = new MuxVideoAdapter();
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
    const media = new MuxVideoAdapter();
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
