import { describe, expect, it, vi } from 'vitest';
import { createPlaybackEngine } from '../playback-engine';

describe('createPlaybackEngine', () => {
  it('creates engine with state and owners', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    expect(engine.state).toBeDefined();
    expect(engine.owners).toBeDefined();
    expect(engine.destroy).toBeDefined();
    expect(typeof engine.destroy).toBe('function');

    engine.destroy();
  });

  it('initializes owners with mediaElement', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    expect(engine.owners.current.mediaElement).toBe(mediaElement);

    engine.destroy();
  });

  it('accepts custom configuration', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
      initialBandwidth: 3_000_000,
      preferredAudioLanguage: 'es',
    });

    // Engine should be created successfully with config
    expect(engine.state).toBeDefined();

    engine.destroy();
  });

  it('cleans up all orchestrations on destroy', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    // Should not throw
    expect(() => engine.destroy()).not.toThrow();
  });

  it('can be destroyed multiple times safely', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

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

    // Dispatch event to trigger combineLatest
    engine.events.dispatch({ type: 'play' });

    // Wait for presentation to be resolved
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
