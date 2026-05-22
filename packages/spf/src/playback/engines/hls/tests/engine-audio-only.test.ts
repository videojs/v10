import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapshot } from '../../../../core/signals/primitives';
import { createHlsAudioOnlyEngine } from '../engine-audio-only';

// Mock appendSegment to succeed without real MP4 data
vi.mock('../../../../media/dom/mse/append-segment', () => ({
  appendSegment: vi.fn().mockResolvedValue(undefined),
}));

describe('createHlsAudioOnlyEngine', () => {
  let originalFetch: typeof globalThis.fetch;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Tests assert at actor-presence and state-shape level, not at "init
  // segment appended" level — so unmocked init/segment URLs in the manifests
  // are intentional. The fetch loop's reject path leaks a console.error in
  // each test; suppress only the expected patterns so genuine failures still
  // surface.
  const expectedErrorPatterns = [
    /Unexpected error in segment loader.*Unmocked URL/s,
    /Failed to load text-track segment/,
  ];

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    const originalConsoleError = console.error.bind(console);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
      if (expectedErrorPatterns.some((p) => p.test(text))) return;
      originalConsoleError(...args);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  it('creates engine with state, context, and destroy', () => {
    const engine = createHlsAudioOnlyEngine();

    expect(engine.state).toBeDefined();
    expect(engine.context).toBeDefined();
    expect(typeof engine.destroy).toBe('function');

    engine.destroy();
  });

  it('does not seed bandwidthState (no ABR behavior subscribed at init)', () => {
    const engine = createHlsAudioOnlyEngine();

    const state = snapshot(engine.state) as Record<string, unknown>;
    // bandwidthState slot may or may not exist depending on whether any
    // composed behavior declares it; if it exists, it must not be seeded.
    if ('bandwidthState' in state) {
      expect(state.bandwidthState).toBeUndefined();
    }

    engine.destroy();
  });

  it('plays truly audio-only HLS source (parity with default-engine tolerance)', async () => {
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",CHANNELS="2",URI="http://example.com/audio-en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2",AUDIO="audio"
http://example.com/audio-en.m3u8`)
        );
      }

      if (url.includes('audio-en.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-audio.mp4"
#EXTINF:10.0,
http://example.com/audio-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createHlsAudioOnlyEngine();
    const mediaElement = document.createElement('video');
    mediaElement.preload = 'auto';

    engine.context.mediaElement.set(mediaElement);
    engine.state.presentation.set({ url: 'http://example.com/playlist.m3u8' });
    engine.state.preload.set('auto');

    await vi.waitFor(
      () => {
        const state = snapshot(engine.state);
        const owners = snapshot(engine.context);

        expect(state.selectedAudioTrackId).toBeDefined();
        expect(owners.audioBufferActor).toBeDefined();
        expect(owners.mediaSource).toBeDefined();
        expect(owners.mediaSource?.readyState).toBe('open');
      },
      { timeout: 2000 }
    );

    engine.destroy();
  });

  it('plays mixed HLS source as audio-only (video tracks ignored)', async () => {
    // Mixed AV manifest: audio rendition + video stream-inf. The variant
    // should compose audio behaviors only — no video selection, no video
    // buffer actor, no video segment loading.
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",CHANNELS="2",URI="http://example.com/audio-en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E,mp4a.40.2",AUDIO="audio",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      if (url.includes('audio-en.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-audio.mp4"
#EXTINF:10.0,
http://example.com/audio-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      // Video playlist is NOT expected to be fetched — fail loudly if it is.
      if (url.includes('video-360p.m3u8')) {
        throw new Error('Audio-only variant fetched the video media playlist');
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createHlsAudioOnlyEngine();
    const mediaElement = document.createElement('video');
    mediaElement.preload = 'auto';

    engine.context.mediaElement.set(mediaElement);
    engine.state.presentation.set({ url: 'http://example.com/playlist.m3u8' });
    engine.state.preload.set('auto');

    await vi.waitFor(
      () => {
        const state = snapshot(engine.state) as Record<string, unknown>;
        const owners = snapshot(engine.context) as Record<string, unknown>;

        // Audio-side fully exercised
        expect(state.selectedAudioTrackId).toBeDefined();
        expect(owners.audioBufferActor).toBeDefined();
        expect(owners.mediaSource).toBeDefined();
        expect((owners.mediaSource as MediaSource).readyState).toBe('open');

        // Video-side slots absent — no composed behavior in this variant
        // declares them. Behaviors that read these slots defensively
        // (`endOfStream` for videoBufferActor; `calculatePresentationDuration`
        // for selectedVideoTrackId) treat them as optional context/state
        // fields and don't leak the slot into the composition. Asserting
        // absence catches regressions where a behavior re-introduces a
        // video-side declaration.
        expect('videoBufferActor' in owners).toBe(false);
        expect('videoSegmentLoaderActor' in owners).toBe(false);
        expect('selectedVideoTrackId' in state).toBe(false);
      },
      { timeout: 2000 }
    );

    engine.destroy();
  });

  it('plays mixed HLS source with subtitles ignored', async () => {
    // Mixed AV manifest with a subtitle rendition. Subtitle behaviors are
    // subtracted in Phase 1, so no text-track machinery should be set up.
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",CHANNELS="2",URI="http://example.com/audio-en.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",DEFAULT=YES,AUTOSELECT=YES,URI="http://example.com/text-en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E,mp4a.40.2",AUDIO="audio",SUBTITLES="subs",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      if (url.includes('audio-en.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-audio.mp4"
#EXTINF:10.0,
http://example.com/audio-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      if (url.includes('text-en.m3u8') || url.includes('video-360p.m3u8')) {
        throw new Error(`Audio-only variant fetched a non-audio playlist: ${url}`);
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createHlsAudioOnlyEngine();
    const mediaElement = document.createElement('video');
    mediaElement.preload = 'auto';

    engine.context.mediaElement.set(mediaElement);
    engine.state.presentation.set({ url: 'http://example.com/playlist.m3u8' });
    engine.state.preload.set('auto');

    await vi.waitFor(
      () => {
        const state = snapshot(engine.state) as Record<string, unknown>;
        const owners = snapshot(engine.context) as Record<string, unknown>;

        expect(state.selectedAudioTrackId).toBeDefined();
        expect(owners.audioBufferActor).toBeDefined();

        // Text-track slots absent — Phase 1 subtracts all text-track
        // behaviors, and no remaining behavior declares the slots.
        expect('selectedTextTrackId' in state).toBe(false);
        expect('textTracksActor' in owners).toBe(false);
        expect('textTrackSegmentLoaderActor' in owners).toBe(false);
      },
      { timeout: 2000 }
    );

    engine.destroy();
  });

  it('cleans up on destroy', () => {
    const engine = createHlsAudioOnlyEngine();
    expect(() => engine.destroy()).not.toThrow();
  });
});
