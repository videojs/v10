import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackEngine } from '../playback-engine';

describe('createPlaybackEngine', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    // Save original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });
  it('creates engine with state, owners, and events', () => {
    const engine = createPlaybackEngine();

    expect(engine.state).toBeDefined();
    expect(engine.owners).toBeDefined();
    expect(engine.events).toBeDefined();
    expect(engine.destroy).toBeDefined();
    expect(typeof engine.destroy).toBe('function');

    engine.destroy();
  });

  it('initializes with empty state and owners', () => {
    const engine = createPlaybackEngine();

    expect(engine.state.current).toEqual({});
    expect(engine.owners.current).toEqual({});

    engine.destroy();
  });

  it('allows patching state and owners from outside', async () => {
    const engine = createPlaybackEngine();

    const mediaElement = document.createElement('video');
    engine.owners.patch({ mediaElement });
    engine.state.patch({
      presentation: { url: 'https://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    // Wait for microtask queue to drain (patches are batched)
    await new Promise((resolve) => queueMicrotask(resolve));

    expect(engine.owners.current.mediaElement).toBe(mediaElement);
    expect(engine.state.current.presentation?.url).toBe('https://example.com/playlist.m3u8');

    engine.destroy();
  });

  it('accepts custom configuration', () => {
    const engine = createPlaybackEngine({
      initialBandwidth: 3_000_000,
      preferredAudioLanguage: 'es',
    });

    // Engine should be created successfully with config
    expect(engine.state).toBeDefined();

    engine.destroy();
  });

  it('cleans up all orchestrations on destroy', () => {
    const engine = createPlaybackEngine();

    // Should not throw
    expect(() => engine.destroy()).not.toThrow();
  });

  it('can be destroyed multiple times safely', () => {
    const engine = createPlaybackEngine();

    engine.destroy();

    // Second destroy should not throw
    expect(() => engine.destroy()).not.toThrow();
  });

  it('resolves presentation when URL and preload are patched', async () => {
    // Mock fetch with URL-based lookup for different playlist types
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      // Multivariant playlist
      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      // Video media playlist
      if (url.includes('video-360p.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init.mp4"
#EXTINF:10.0,
http://example.com/segment1.m4s
#EXT-X-ENDLIST`)
        );
      }

      // Fallback for unmocked URLs
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createPlaybackEngine();

    // Patch state to trigger presentation resolution
    engine.state.patch({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    // Wait for presentation to be resolved (no event needed - state-driven)
    await vi.waitFor(
      () => {
        const { presentation } = engine.state.current;
        expect(presentation?.selectionSets).toBeDefined();
        expect(presentation?.selectionSets?.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    // Verify fetch was called
    expect(mockFetch).toHaveBeenCalled();

    engine.destroy();
  });
});
