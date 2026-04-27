import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import type { AddressableObject, Presentation } from '../../../media/types';
import { isUnresolved, resolvePresentation, shouldResolve } from '../resolve-presentation';

describe('resolvePresentation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('resolves unresolved presentation', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    const state = signal<State>({
      presentation: undefined,
      preload: 'auto',
    });

    // Mock fetch
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000
variant2.m3u8`)
    );

    // Act
    const reactor = resolvePresentation({ state });

    // Trigger resolution by setting unresolved presentation
    state.set({ ...state.get(), presentation: { url: 'http://example.com/playlist.m3u8' } });

    // Wait for resolution
    await vi.waitFor(() => {
      const current = state.get();
      expect(current.presentation).toBeDefined();
      expect(current.presentation).toHaveProperty('id');
      expect(current.presentation).toHaveProperty('selectionSets');
    });

    // Assert
    const resolved = state.get().presentation as Presentation;
    expect(resolved.url).toBe('http://example.com/playlist.m3u8');
    expect(resolved.selectionSets).toBeDefined();
    expect(resolved.selectionSets.length).toBeGreaterThan(0);

    // Check that we have video tracks
    const videoSet = resolved.selectionSets.find((s) => s.type === 'video');
    expect(videoSet).toBeDefined();
    expect(videoSet!.switchingSets).toBeDefined();
    expect(videoSet!.switchingSets[0]?.tracks.length).toBeGreaterThan(0);

    // Cleanup
    reactor.destroy();
  });

  it('does not trigger resolution when other state fields change', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
      volume: number;
    }

    const state = signal<State>({
      presentation: undefined,
      preload: 'auto',
      volume: 1.0,
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
    );

    // Act
    const reactor = resolvePresentation({ state });

    // Change volume before resolution
    state.set({ ...state.get(), volume: 0.5 });

    // Wait a bit to ensure no fetch triggered
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Now add unresolved presentation
    state.set({ ...state.get(), presentation: { url: 'http://example.com/playlist.m3u8' } });

    // Wait for resolution
    await vi.waitFor(() => {
      expect(state.get().presentation).toHaveProperty('id');
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    // Change volume after resolution
    state.set({ ...state.get(), volume: 0.8 });

    // Wait a bit to ensure no additional fetch
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    reactor.destroy();
  });

  it('resolves presentation initialized as unresolved', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
    );

    // State starts with unresolved presentation
    const state = signal<State>({
      presentation: { url: 'http://example.com/initial.m3u8' },
      preload: 'auto',
    });

    // Act
    const reactor = resolvePresentation({ state });

    // Wait for resolution (should happen automatically)
    await vi.waitFor(() => {
      const current = state.get();
      expect(current.presentation).toHaveProperty('id');
      expect(current.presentation).toHaveProperty('selectionSets');
    });

    // Assert
    const resolved = state.get().presentation as Presentation;
    expect(resolved.url).toBe('http://example.com/initial.m3u8');
    expect(resolved.selectionSets).toBeDefined();

    // Cleanup
    reactor.destroy();
  });

  it('does not re-resolve presentation initialized as resolved', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    // Create a resolved presentation
    const resolvedPresentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/resolved.m3u8',
      selectionSets: [
        {
          id: 'video-set',
          type: 'video',
          switchingSets: [
            {
              id: 'switching-1',
              type: 'video',
              tracks: [
                {
                  type: 'video',
                  id: 'track-1',
                  url: 'http://example.com/variant1.m3u8',
                  bandwidth: 1000000,
                  mimeType: 'video/mp4',
                  codecs: [],
                },
              ],
            },
          ],
        },
      ],
      startTime: 0,
    };

    // State starts with resolved presentation
    const state = signal<State>({
      presentation: resolvedPresentation,
      preload: 'auto',
    });

    // Act
    const reactor = resolvePresentation({ state });

    // Wait a bit to ensure no fetch triggered
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert - should not fetch
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.get().presentation).toBe(resolvedPresentation);

    // Cleanup
    reactor.destroy();
  });

  it('resolves new unresolved presentation after resolved one', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000
variant2.m3u8`)
    );

    // Create initial resolved presentation
    const resolvedPresentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/first.m3u8',
      selectionSets: [],
      startTime: 0,
    };

    const state = signal<State>({
      presentation: resolvedPresentation,
      preload: 'auto',
    });

    // Act
    const reactor = resolvePresentation({ state });

    // Replace with unresolved presentation
    state.set({ ...state.get(), presentation: { url: 'http://example.com/second.m3u8' } });

    // Wait for resolution
    await vi.waitFor(() => {
      const current = state.get();
      expect(current.presentation).toHaveProperty('id');
      expect((current.presentation as Presentation).url).toBe('http://example.com/second.m3u8');
    });

    // Assert - should have fetched and resolved new presentation
    expect(fetchSpy).toHaveBeenCalledOnce();
    const resolved = state.get().presentation as Presentation;
    expect(resolved.url).toBe('http://example.com/second.m3u8');
    expect(resolved.selectionSets).toBeDefined();

    // Cleanup
    reactor.destroy();
  });

  describe('preload policy', () => {
    it('resolves when preload is "auto"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'auto',
      });

      const reactor = resolvePresentation({ state });

      await vi.waitFor(() => {
        expect(state.get().presentation).toHaveProperty('id');
      });

      reactor.destroy();
    });

    it('resolves when preload is "metadata"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'metadata',
      });

      const reactor = resolvePresentation({ state });

      await vi.waitFor(() => {
        expect(state.get().presentation).toHaveProperty('id');
      });

      reactor.destroy();
    });

    it('does not resolve when preload is "none"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const reactor = resolvePresentation({ state });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.get().presentation).toEqual({ url: 'http://example.com/playlist.m3u8' });

      reactor.destroy();
    });

    it('does not resolve when preload is undefined', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: undefined,
      });

      const reactor = resolvePresentation({ state });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.get().presentation).toEqual({ url: 'http://example.com/playlist.m3u8' });

      reactor.destroy();
    });
  });

  describe('playbackInitiated resolution', () => {
    it('resolves when playbackInitiated is set to true with preload "none"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
        playbackInitiated?: boolean;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const reactor = resolvePresentation({ state });

      // Initially shouldn't fetch (preload="none", not yet initiated)
      expect(fetchSpy).not.toHaveBeenCalled();

      // Set playbackInitiated (replaces the old 'play' event dispatch)
      state.set({ ...state.get(), playbackInitiated: true });

      // Wait for resolution
      await vi.waitFor(() => {
        expect(state.get().presentation).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      reactor.destroy();
    });

    it('does not resolve when playbackInitiated is false with preload "none"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
        playbackInitiated?: boolean;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const reactor = resolvePresentation({ state });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.get().presentation).toEqual({ url: 'http://example.com/playlist.m3u8' });

      reactor.destroy();
    });
  });

  describe('deduplication', () => {
    it('does not trigger multiple fetches for same presentation', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = signal<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'auto',
      });

      const reactor = resolvePresentation({ state });

      // Rapidly trigger additional state changes while resolution is in progress
      state.set({ ...state.get(), preload: 'auto' });
      state.set({ ...state.get(), preload: 'auto' });

      // Wait for resolution
      await vi.waitFor(() => {
        expect(state.get().presentation).toHaveProperty('id');
      });

      // Should only fetch once despite multiple state changes
      expect(fetchSpy).toHaveBeenCalledOnce();

      reactor.destroy();
    });

    it('allows resolving different presentations sequentially', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
          new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = signal<State>({
        presentation: { url: 'http://example.com/first.m3u8' },
        preload: 'auto',
      });

      const reactor = resolvePresentation({ state });

      // Wait for first resolution
      await vi.waitFor(() => {
        expect(state.get().presentation).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      // Now load a different presentation
      state.set({ ...state.get(), presentation: { url: 'http://example.com/second.m3u8' } });

      // Wait for second resolution — check id to confirm the fetch actually completed
      await vi.waitFor(() => {
        const pres = state.get().presentation as Presentation;
        expect(pres).toHaveProperty('id');
        expect(pres.url).toBe('http://example.com/second.m3u8');
      });

      // Should have fetched twice (different URLs)
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      reactor.destroy();
    });
  });
});

describe('shouldResolve', () => {
  it('returns true when preload is "auto"', () => {
    const result = shouldResolve({ presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'auto' });

    expect(result).toBe(true);
  });

  it('returns true when preload is "metadata"', () => {
    const result = shouldResolve({ presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'metadata' });

    expect(result).toBe(true);
  });

  it('returns true when playbackInitiated is true with preload "none"', () => {
    const result = shouldResolve({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'none',
      playbackInitiated: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when preload is "none" and playbackInitiated is false', () => {
    const result = shouldResolve({ presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'none' });

    expect(result).toBe(false);
  });

  it('returns false when preload is undefined', () => {
    const result = shouldResolve({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: undefined,
    });

    expect(result).toBe(false);
  });
});

describe('isUnresolved', () => {
  const resolvedPresentation: Presentation = {
    id: 'pres-1',
    url: 'http://example.com/resolved.m3u8',
    selectionSets: [],
    startTime: 0,
  };

  it('returns true for unresolved presentation', () => {
    const result = isUnresolved({ url: 'http://example.com/playlist.m3u8' });

    expect(result).toBe(true);
  });

  it('returns false for resolved presentation', () => {
    const result = isUnresolved(resolvedPresentation);

    expect(result).toBe(false);
  });

  it('returns false for undefined', () => {
    const result = isUnresolved(undefined);

    expect(result).toBe(false);
  });
});
