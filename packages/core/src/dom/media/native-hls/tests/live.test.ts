import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NativeMediaHost } from '../errors';
import { NativeHlsMediaLiveMixin } from '../live';

class FakeHost extends EventTarget implements NativeMediaHost {
  #target: HTMLMediaElement | null = null;

  get target() {
    return this.#target;
  }

  attach(target: HTMLMediaElement): void {
    if (!target || this.#target === target) return;
    this.#target = target;
  }

  detach(): void {
    this.#target = null;
  }

  destroy(): void {
    this.#target = null;
  }
}

const NativeHlsMediaLive = NativeHlsMediaLiveMixin(FakeHost);

function createVideoWithSrc(src: string, seekableEnd: number | null = null): HTMLVideoElement {
  const video = document.createElement('video');
  // JSDOM doesn't actually load the src; we just need the attribute to stick.
  Object.defineProperty(video, 'currentSrc', { configurable: true, value: src });
  if (seekableEnd !== null) {
    Object.defineProperty(video, 'seekable', {
      configurable: true,
      get() {
        return {
          length: 1,
          start: () => 0,
          end: () => seekableEnd,
        } as TimeRanges;
      },
    });
  }
  return video;
}

function mockFetch(responses: Record<string, string | { status: number; body?: string }>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      const entry = responses[url] ?? responses[Object.keys(responses).find((key) => url.endsWith(key)) ?? ''];
      if (entry === undefined) {
        return new Response('not found', { status: 404 });
      }
      if (typeof entry === 'string') {
        return new Response(entry, { status: 200 });
      }
      return new Response(entry.body ?? '', { status: entry.status });
    })
  );
}

async function flushPromises() {
  // Allow the async fetch chain inside the mixin to settle.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NativeHlsMediaLiveMixin', () => {
  describe('defaults', () => {
    it('returns `NaN` for both properties before a playlist is parsed', () => {
      const host = new NativeHlsMediaLive();
      expect(host.liveEdgeStart).toBeNaN();
      expect(host.targetLiveWindow).toBeNaN();
    });
  });

  describe('standard live', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-VERSION:6',
      '#EXT-X-TARGETDURATION:6',
      '#EXT-X-MEDIA-SEQUENCE:0',
      '#EXTINF:6.0,',
      'segment0.ts',
    ].join('\n');

    it('derives `targetLiveWindow=0` and offset from `#EXT-X-TARGETDURATION`', async () => {
      mockFetch({ 'https://example.com/live.m3u8': playlist });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/live.m3u8', 60);

      const handler = vi.fn();
      host.addEventListener('targetlivewindowchange', handler);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));

      await flushPromises();

      expect(host.targetLiveWindow).toBe(0);
      // seekable.end(60) - (targetDuration 6 * 3) = 42
      expect(host.liveEdgeStart).toBe(42);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('DVR (EVENT playlist)', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-VERSION:6',
      '#EXT-X-PLAYLIST-TYPE:EVENT',
      '#EXT-X-TARGETDURATION:6',
      '#EXT-X-MEDIA-SEQUENCE:0',
      '#EXTINF:6.0,',
      'segment0.ts',
    ].join('\n');

    it('derives `targetLiveWindow=Infinity`', async () => {
      mockFetch({ 'https://example.com/dvr.m3u8': playlist });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/dvr.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBe(Number.POSITIVE_INFINITY);
      expect(host.liveEdgeStart).toBe(42);
    });
  });

  describe('VOD playlist', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-VERSION:6',
      '#EXT-X-PLAYLIST-TYPE:VOD',
      '#EXT-X-TARGETDURATION:6',
      '#EXTINF:6.0,',
      'segment0.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');

    it('leaves `targetLiveWindow=NaN` for on-demand', async () => {
      mockFetch({ 'https://example.com/vod.m3u8': playlist });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/vod.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });
  });

  describe('low-latency live', () => {
    const playlist = [
      '#EXTM3U',
      '#EXT-X-VERSION:9',
      '#EXT-X-TARGETDURATION:4',
      '#EXT-X-PART-INF:PART-TARGET=0.5',
      '#EXTINF:4.0,',
      'segment0.ts',
    ].join('\n');

    it('uses `PART-TARGET * 2` for the offset', async () => {
      mockFetch({ 'https://example.com/ll.m3u8': playlist });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/ll.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBe(0);
      // 60 - (0.5 * 2) = 59
      expect(host.liveEdgeStart).toBe(59);
    });
  });

  describe('multivariant playlist', () => {
    const master = ['#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720', 'media.m3u8'].join('\n');
    const media = ['#EXTM3U', '#EXT-X-VERSION:6', '#EXT-X-TARGETDURATION:6', '#EXTINF:6.0,', 'segment0.ts'].join('\n');

    it('follows the first `#EXT-X-STREAM-INF` to the media playlist', async () => {
      mockFetch({
        'https://example.com/master.m3u8': master,
        'https://example.com/media.m3u8': media,
      });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/master.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBe(0);
      expect(host.liveEdgeStart).toBe(42);
    });
  });

  describe('non-HLS sources', () => {
    it('does not fetch for `.mp4` sources', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/video.mp4', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });
  });

  describe('errors and teardown', () => {
    it('leaves values at `NaN` on fetch failure', async () => {
      mockFetch({ 'https://example.com/missing.m3u8': { status: 404 } });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/missing.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });

    it('resets to `NaN` on `emptied`', async () => {
      const playlist = ['#EXTM3U', '#EXT-X-TARGETDURATION:6', '#EXTINF:6.0,', 'segment0.ts'].join('\n');
      mockFetch({ 'https://example.com/live.m3u8': playlist });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/live.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBe(0);

      video.dispatchEvent(new Event('emptied'));

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });

    it('resets to `NaN` after `destroy`', async () => {
      const playlist = ['#EXTM3U', '#EXT-X-TARGETDURATION:6', '#EXTINF:6.0,', 'segment0.ts'].join('\n');
      mockFetch({ 'https://example.com/live.m3u8': playlist });

      const host = new NativeHlsMediaLive();
      const video = createVideoWithSrc('https://example.com/live.m3u8', 60);

      host.attach(video);
      video.dispatchEvent(new Event('loadstart'));
      await flushPromises();

      expect(host.targetLiveWindow).toBe(0);

      host.destroy();

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });
  });
});
