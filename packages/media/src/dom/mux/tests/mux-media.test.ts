import { describe, expect, it, vi } from 'vitest';
import { Hls, HlsJsMedia } from '../../hls-js';
import { MuxMedia } from '..';

// Header `{"alg":"HS256"}`, body sets `aud`, empty signature. Unpadded base64url,
// like a real JWT, so it survives a query string untouched.
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.`;
}

// `source` and `src` request a load on a microtask, so give it a chance to run.
function flushLoad() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

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

  it('keeps a non-Mux src as a plain source url', () => {
    const media = new MuxMedia();
    media.src = 'https://example.com/custom.m3u8';

    expect(media.src).toBe('https://example.com/custom.m3u8');
    expect(media.source).toEqual({ src: 'https://example.com/custom.m3u8' });
  });

  it('plays a non-Mux source url given through source', () => {
    const media = new MuxMedia();
    media.source = { src: 'https://example.com/custom.m3u8', preferPlayback: 'native' };

    expect(media.src).toBe('https://example.com/custom.m3u8');
  });

  it('preserves engine options across a src change', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', preferPlayback: 'native' };

    media.src = 'https://stream.mux.com/other.m3u8';

    expect(media.source).toEqual({ playbackId: 'other', preferPlayback: 'native' });
  });

  it('keeps source.poster as data, without applying it to the media poster', () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));

    media.source = { playbackId: 'abc123', poster: { time: 5 } };

    expect(media.source?.poster).toEqual({ time: 5 });
    expect(media.poster).toBe('');
  });

  it('exposes the content poster and storyboard derived from source', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', poster: { time: 5, ext: 'jpg' }, storyboard: { format: 'jpg' } };

    expect(media.contentData).toEqual({
      poster: 'https://image.mux.com/abc123/thumbnail.jpg?time=5',
      storyboard: 'https://image.mux.com/abc123/storyboard.vtt?format=jpg',
    });
  });

  it('tracks source changes in the content data', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };
    media.source = { playbackId: 'xyz789' };

    expect(media.contentData.poster).toBe('https://image.mux.com/xyz789/thumbnail.webp');
    expect(media.contentData.storyboard).toBe('https://image.mux.com/xyz789/storyboard.vtt?format=webp');
  });

  it('has no content data without a playback id', () => {
    const media = new MuxMedia();

    expect(media.contentData).toEqual({});

    media.src = 'https://example.com/custom.m3u8';

    expect(media.contentData).toEqual({});
  });

  it('has no content data for signed playback without image tokens', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', playback: { token: 'jwt' } };

    expect(media.contentData).toEqual({});
  });

  it('does not reload when only image params change', async () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));
    media.source = { playbackId: 'abc123', preferPlayback: 'native' };
    await flushLoad();

    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    // `poster` describes an image, not the stream, so playback must not restart.
    media.source = { playbackId: 'abc123', preferPlayback: 'native', poster: { time: 5 } };
    await flushLoad();

    expect(loadstart).not.toHaveBeenCalled();
  });

  it('reloads when the playback id changes', async () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));
    media.source = { playbackId: 'abc123', preferPlayback: 'native' };
    await flushLoad();

    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    media.source = { playbackId: 'xyz789', preferPlayback: 'native' };
    await flushLoad();

    expect(loadstart).toHaveBeenCalled();
  });

  it('does not reload for an equivalent nested engine option', async () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));
    const engine = { drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://drm.example/license' } } };
    media.source = { playbackId: 'abc123', preferPlayback: 'native', engine };
    await flushLoad();

    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    // Same values, new object identity all the way down — as React would hand it
    // over. A flat comparison would call this an engine change and restart.
    media.source = {
      playbackId: 'abc123',
      preferPlayback: 'native',
      engine: { drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://drm.example/license' } } },
      poster: { time: 5 },
    };
    await flushLoad();

    expect(loadstart).not.toHaveBeenCalled();
  });

  it('reloads when a nested engine option changes', async () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));
    media.source = {
      playbackId: 'abc123',
      preferPlayback: 'native',
      engine: { drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://drm.example/license' } } },
    };
    await flushLoad();

    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    media.source = {
      playbackId: 'abc123',
      preferPlayback: 'native',
      engine: { drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://drm.example/other' } } },
    };
    await flushLoad();

    expect(loadstart).toHaveBeenCalled();
  });

  it('reloads when engine options change', async () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));
    media.source = { playbackId: 'abc123', preferPlayback: 'native' };
    await flushLoad();

    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    media.source = { playbackId: 'abc123', preferPlayback: 'native', engine: { maxBufferLength: 60 } };
    await flushLoad();

    expect(loadstart).toHaveBeenCalled();
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

  it('ignores the same source object', () => {
    const media = new MuxMedia();
    const source = { playbackId: 'abc123' };
    media.source = source;

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.source = source;

    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it('announces a new source object even when it is equal', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123' };

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.source = { playbackId: 'abc123' };

    expect(onSourceChange).toHaveBeenCalledOnce();
  });

  it('does not reload for a structurally equal source', async () => {
    const media = new MuxMedia();
    media.attach(document.createElement('video'));
    media.source = { playbackId: 'abc123', preferPlayback: 'native' };
    await flushLoad();

    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    media.source = { playbackId: 'abc123', preferPlayback: 'native' };
    await flushLoad();

    expect(loadstart).not.toHaveBeenCalled();

    media.source = { playbackId: 'other', preferPlayback: 'native' };
    await flushLoad();

    expect(loadstart).toHaveBeenCalledOnce();
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

  it('fires sourcechange when a non-Mux src replaces another', () => {
    const media = new MuxMedia();
    media.src = 'https://example.com/a.m3u8';

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);
    media.src = 'https://example.com/b.m3u8';

    expect(onSourceChange).toHaveBeenCalledOnce();
    expect(media.source).toEqual({ src: 'https://example.com/b.m3u8' });
  });

  it('ignores a src that already describes the current source', () => {
    const media = new MuxMedia();
    media.source = { playbackId: 'abc123', poster: { time: 5 } };

    const onSourceChange = vi.fn();
    media.addEventListener('sourcechange', onSourceChange);

    // `<mux-video>` reflects the derived URL back to the host, so this has to be
    // a no-op rather than re-deriving and dropping `poster`.
    media.src = 'https://stream.mux.com/abc123.m3u8';

    expect(onSourceChange).not.toHaveBeenCalled();
    expect(media.source).toEqual({ playbackId: 'abc123', poster: { time: 5 } });
  });

  describe('drm', () => {
    const DRM_TOKEN = fakeJwt({ aud: 'd' });
    const PLAYBACK_TOKEN = fakeJwt({ aud: 'v' });

    function setupMse() {
      vi.spyOn(Hls, 'isSupported').mockReturnValue(true);

      const media = new MuxMedia();
      media.attach(document.createElement('video'));
      return media;
    }

    it('configures the hls.js engine from a DRM token', async () => {
      const media = setupMse();
      media.source = { playbackId: 'abc123', playback: { token: PLAYBACK_TOKEN }, drm: { token: DRM_TOKEN } };
      await flushLoad();

      expect(media.engine!.config.emeEnabled).toBe(true);
      expect(media.engine!.config.drmSystems).toEqual({
        'com.apple.fps': {
          licenseUrl: `https://license.mux.com/license/fairplay/abc123?token=${DRM_TOKEN}`,
          serverCertificateUrl: `https://license.mux.com/appcert/fairplay/abc123?token=${DRM_TOKEN}`,
        },
        'com.widevine.alpha': { licenseUrl: `https://license.mux.com/license/widevine/abc123?token=${DRM_TOKEN}` },
        'com.microsoft.playready': {
          licenseUrl: `https://license.mux.com/license/playready/abc123?token=${DRM_TOKEN}`,
        },
      });
    });

    it('leaves EME alone without a DRM token', async () => {
      const media = setupMse();
      media.source = { playbackId: 'abc123' };
      await flushLoad();

      expect(media.engine!.config.emeEnabled).toBe(false);
    });

    it('keeps the Mux token out of the source handed to the engine', async () => {
      const media = setupMse();
      media.source = { playbackId: 'abc123', drm: { token: DRM_TOKEN } };
      await flushLoad();

      // `drm` stays Mux's own authoring input; only the derived license servers
      // reach the HLS layer.
      expect(media.source).toEqual({ playbackId: 'abc123', drm: { token: DRM_TOKEN } });
    });

    it('lets an explicit engine.drmSystems override the derived one', async () => {
      const media = setupMse();
      media.source = {
        playbackId: 'abc123',
        drm: { token: DRM_TOKEN },
        engine: { drmSystems: { 'com.widevine.alpha': { licenseUrl: 'https://drm.example/license' } } },
      };
      await flushLoad();

      // EME still switches on, but the caller's license servers stand.
      expect(media.engine!.config.emeEnabled).toBe(true);
      expect(media.engine!.config.drmSystems).toEqual({
        'com.widevine.alpha': { licenseUrl: 'https://drm.example/license' },
      });
    });

    it('does not reload for an equivalent DRM token', async () => {
      const media = setupMse();
      media.source = { playbackId: 'abc123', drm: { token: DRM_TOKEN } };
      await flushLoad();

      const loadstart = vi.fn();
      media.addEventListener('loadstart', loadstart);

      media.source = { playbackId: 'abc123', drm: { token: DRM_TOKEN } };
      await flushLoad();

      expect(loadstart).not.toHaveBeenCalled();
    });

    it('reloads when the DRM token changes', async () => {
      const media = setupMse();
      media.source = { playbackId: 'abc123', drm: { token: DRM_TOKEN } };
      await flushLoad();

      const loadstart = vi.fn();
      media.addEventListener('loadstart', loadstart);

      media.source = { playbackId: 'abc123', drm: { token: fakeJwt({ aud: 'd', exp: 1 }) } };
      await flushLoad();

      expect(loadstart).toHaveBeenCalled();
    });
  });
});
