import { describe, expect, it, vi } from 'vitest';
import { createPlaybackEngine } from '../playback-engine';

describe('createPlaybackEngine', () => {
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
    // Mock fetch to return simple multivariant playlist
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
    );
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
