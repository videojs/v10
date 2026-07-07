import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapshot } from '../../../../core/signals/primitives';
import type { Presentation } from '../../../../media/types';
import { createHlsAudioOnlyEngine } from '../engine-audio-only';

// Mock appendSegment to succeed without real MP4 data
vi.mock('../../../../media/dom/mse/append-segment', () => ({
  appendSegment: vi.fn().mockResolvedValue(undefined),
}));

// Fallback for URLs a test's mock doesn't handle explicitly. Segment/init
// requests resolve with an empty body — the appendSegment mock makes the bytes
// inert — so the failover monitor isn't tripped by unmocked segment fetches (a
// single failed fetch trips that CDN into cooldown, which empties the candidate
// set). Genuinely unknown URLs still reject loudly.
function unmockedFetchFallback(url: string): Promise<Response> {
  // Non-empty body: `fetchStream` throws "Response has no body" on a null body
  // (empty Uint8Array), which would itself trip the monitor.
  if (/\.(m4s|mp4|ts|aac)(\?|$)/.test(url)) return Promise.resolve(new Response(new Uint8Array([0])));
  return Promise.reject(new Error(`Unmocked URL: ${url}`));
}

describe('createHlsAudioOnlyEngine', () => {
  let originalFetch: typeof globalThis.fetch;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Tests assert at actor-presence and state-shape level, not at "init segment
  // appended" level. Audio/video segment fetches resolve via
  // `unmockedFetchFallback` (inert under the appendSegment mock); text-track
  // segment fetches still reject and leak a console.error. Suppress only the
  // expected patterns so genuine failures still surface.
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

  it('exposes userAudioTrackSelection slot for multi-language-audio Tier 2 writes', () => {
    const engine = createHlsAudioOnlyEngine();

    // Slot exists as a signal — consumer-facing programmatic-write path
    // for multi-language-audio.
    expect(engine.state.userAudioTrackSelection).toBeDefined();
    expect(typeof engine.state.userAudioTrackSelection.get).toBe('function');
    expect(typeof engine.state.userAudioTrackSelection.set).toBe('function');

    engine.state.userAudioTrackSelection.set({ language: 'es' });
    expect(engine.state.userAudioTrackSelection.get()).toEqual({ language: 'es' });

    engine.destroy();
  });

  it('wires the default canPlayTrack — prunes an undecodable (raw-AAC) audio source, making no pick', async () => {
    const flush = () => Promise.resolve().then(() => Promise.resolve());
    // No canPlayTrack override → relies on the engine's default. A raw-AAC
    // (audio/aac) rendition is asserted unplayable, so it should be pruned
    // rather than selected. (If the default weren't wired, the constraint would
    // pass through and select it.)
    const engine = createHlsAudioOnlyEngine();
    engine.state.presentation.set({
      id: 'pres-aac',
      url: 'https://example.com/master.m3u8',
      startTime: 0,
      selectionSets: [
        {
          id: 'a',
          type: 'audio',
          switchingSets: [
            {
              id: 'as',
              type: 'audio',
              tracks: [
                {
                  type: 'audio',
                  id: 'aud-aac',
                  codecs: ['mp4a.40.2'],
                  url: 'https://example.com/aud.m3u8',
                  bandwidth: 128_000,
                  mimeType: 'audio/aac',
                  groupId: 'audio',
                  name: 'Default',
                  sampleRate: 48_000,
                  channels: 2,
                },
              ],
            },
          ],
        },
      ],
    } as Presentation);
    await flush();

    expect(engine.state.selectedAudioTrackId.get()).toBeUndefined();

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

      return unmockedFetchFallback(url);
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
        // readyState isn't asserted: with appendSegment mocked the stream completes
        // instantly, so the MediaSource doesn't durably sit in 'open' (a created buffer
        // actor implies addSourceBuffer ran, which requires an open MediaSource).
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

      return unmockedFetchFallback(url);
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
        // readyState isn't asserted: with appendSegment mocked the stream completes
        // instantly, so the MediaSource doesn't durably sit in 'open' (a created buffer
        // actor implies addSourceBuffer ran, which requires an open MediaSource).

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

      return unmockedFetchFallback(url);
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
