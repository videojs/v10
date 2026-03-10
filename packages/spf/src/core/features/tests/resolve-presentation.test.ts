import { describe, expect, it, vi } from 'vitest';
import { createEventStream } from '../../events/create-event-stream';
import { createState } from '../../state/create-state';
import type { AddressableObject, MediaElementLike, Presentation } from '../../types';
import type { PlatformOwners, PresentationAction } from '../resolve-presentation';
import { isUnresolved, resolvePresentation, shouldResolve, syncPreloadAttribute } from '../resolve-presentation';

describe('resolvePresentation', () => {
  it('resolves unresolved presentation', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    const state = createState<State>({
      presentation: undefined,
      preload: 'auto',
    });

    const events = createEventStream<PresentationAction>();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000
variant2.m3u8`)
    );

    // Act
    const cleanup = resolvePresentation({ state, events });

    // Dispatch initial neutral event to prime combineLatest
    events.dispatch({ type: 'pause' });

    // Trigger resolution by patching unresolved presentation
    state.patch({ presentation: { url: 'http://example.com/playlist.m3u8' } });

    // Wait for resolution
    await vi.waitFor(() => {
      const current = state.current;
      expect(current.presentation).toBeDefined();
      expect(current.presentation).toHaveProperty('id');
      expect(current.presentation).toHaveProperty('selectionSets');
    });

    // Assert
    const resolved = state.current.presentation as Presentation;
    expect(resolved.url).toBe('http://example.com/playlist.m3u8');
    expect(resolved.selectionSets).toBeDefined();
    expect(resolved.selectionSets.length).toBeGreaterThan(0);

    // Check that we have video tracks
    const videoSet = resolved.selectionSets.find((s) => s.type === 'video');
    expect(videoSet).toBeDefined();
    expect(videoSet!.switchingSets).toBeDefined();
    expect(videoSet!.switchingSets[0]?.tracks.length).toBeGreaterThan(0);

    // Cleanup
    cleanup();
  });

  it('does not trigger resolution when other state fields change', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
      volume: number;
    }

    const state = createState<State>({
      presentation: undefined,
      preload: 'auto',
      volume: 1.0,
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
    );

    // Act
    const events = createEventStream<PresentationAction>();
    const cleanup = resolvePresentation({ state, events });

    // Dispatch initial neutral event to prime combineLatest
    events.dispatch({ type: 'pause' });

    // Change volume before resolution
    state.patch({ volume: 0.5 });

    // Wait a bit to ensure no fetch triggered
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Now add unresolved presentation
    state.patch({ presentation: { url: 'http://example.com/playlist.m3u8' } });

    // Wait for resolution
    await vi.waitFor(() => {
      expect(state.current.presentation).toHaveProperty('id');
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    // Change volume after resolution
    state.patch({ volume: 0.8 });

    // Wait a bit to ensure no additional fetch
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    cleanup();
  });

  it('resolves presentation initialized as unresolved', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    global.fetch = vi.fn().mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
    );

    // State starts with unresolved presentation
    const state = createState<State>({
      presentation: { url: 'http://example.com/initial.m3u8' },
      preload: 'auto',
    });

    // Act
    const events = createEventStream<PresentationAction>();
    const cleanup = resolvePresentation({ state, events });

    // Dispatch initial neutral event to prime combineLatest
    events.dispatch({ type: 'pause' });

    // Wait for resolution (should happen automatically)
    await vi.waitFor(() => {
      const current = state.current;
      expect(current.presentation).toHaveProperty('id');
      expect(current.presentation).toHaveProperty('selectionSets');
    });

    // Assert
    const resolved = state.current.presentation as Presentation;
    expect(resolved.url).toBe('http://example.com/initial.m3u8');
    expect(resolved.selectionSets).toBeDefined();

    // Cleanup
    cleanup();
  });

  it('does not re-resolve presentation initialized as resolved', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    const fetchSpy = vi.spyOn(global, 'fetch');

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
    const state = createState<State>({
      presentation: resolvedPresentation,
      preload: 'auto',
    });

    // Act
    const events = createEventStream<PresentationAction>();
    const cleanup = resolvePresentation({ state, events });

    // Dispatch initial neutral event to prime combineLatest
    events.dispatch({ type: 'pause' });

    // Wait a bit to ensure no fetch triggered
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert - should not fetch
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.current.presentation).toBe(resolvedPresentation);

    // Cleanup
    cleanup();
  });

  it('resolves new unresolved presentation after resolved one', async () => {
    // Arrange
    interface State {
      presentation?: AddressableObject | Presentation | undefined;
      preload?: 'auto' | 'metadata' | 'none' | undefined;
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
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

    const state = createState<State>({
      presentation: resolvedPresentation,
      preload: 'auto',
    });

    // Act
    const events = createEventStream<PresentationAction>();
    const cleanup = resolvePresentation({ state, events });

    // Dispatch initial neutral event to prime combineLatest
    events.dispatch({ type: 'pause' });

    // Replace with unresolved presentation
    state.patch({ presentation: { url: 'http://example.com/second.m3u8' } });

    // Wait for resolution
    await vi.waitFor(() => {
      const current = state.current;
      expect(current.presentation).toHaveProperty('id');
      expect((current.presentation as Presentation).url).toBe('http://example.com/second.m3u8');
    });

    // Assert - should have fetched and resolved new presentation
    expect(fetchSpy).toHaveBeenCalledOnce();
    const resolved = state.current.presentation as Presentation;
    expect(resolved.url).toBe('http://example.com/second.m3u8');
    expect(resolved.selectionSets).toBeDefined();

    // Cleanup
    cleanup();
  });

  describe('preload policy', () => {
    it('resolves when preload is "auto"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      global.fetch = vi.fn().mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'auto',
      });

      const events = createEventStream<PresentationAction>();
      const cleanup = resolvePresentation({ state, events });

      // Dispatch initial neutral event to prime combineLatest
      events.dispatch({ type: 'pause' });

      await vi.waitFor(() => {
        expect(state.current.presentation).toHaveProperty('id');
      });

      cleanup();
    });

    it('resolves when preload is "metadata"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      global.fetch = vi.fn().mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'metadata',
      });

      const events = createEventStream<PresentationAction>();
      const cleanup = resolvePresentation({ state, events });

      // Dispatch initial neutral event to prime combineLatest
      events.dispatch({ type: 'pause' });

      await vi.waitFor(() => {
        expect(state.current.presentation).toHaveProperty('id');
      });

      cleanup();
    });

    it('does not resolve when preload is "none"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(global, 'fetch');

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const events = createEventStream<PresentationAction>();
      const cleanup = resolvePresentation({ state, events });

      // Dispatch initial neutral event to prime combineLatest
      events.dispatch({ type: 'pause' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.current.presentation).toEqual({ url: 'http://example.com/playlist.m3u8' });

      cleanup();
    });

    it('does not resolve when preload is undefined', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(global, 'fetch');

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: undefined,
      });

      const events = createEventStream<PresentationAction>();
      const cleanup = resolvePresentation({ state, events });

      // Dispatch initial neutral event to prime combineLatest
      events.dispatch({ type: 'pause' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.current.presentation).toEqual({ url: 'http://example.com/playlist.m3u8' });

      cleanup();
    });
  });

  describe('event-driven resolution with combineLatest', () => {
    it('resolves on PLAY event when preload is "none"', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const events = createEventStream<PresentationAction>();

      // Use resolvePresentation with combineLatest composition
      const cleanup = resolvePresentation({ state, events });

      // Dispatch initial neutral event to prime combineLatest
      events.dispatch({ type: 'pause' });

      // Initially shouldn't fetch (preload="none")
      expect(fetchSpy).not.toHaveBeenCalled();

      // Dispatch PLAY event
      events.dispatch({ type: 'play' });

      // Wait for resolution
      await vi.waitFor(() => {
        expect(state.current.presentation).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      cleanup();
    });

    it('does not resolve on non-PLAY events', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(global, 'fetch');

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const events = createEventStream<PresentationAction>();

      const cleanup = resolvePresentation({ state, events });

      // Dispatch PAUSE event (not PLAY) - this primes combineLatest but shouldn't trigger resolution
      events.dispatch({ type: 'pause' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.current.presentation).toEqual({ url: 'http://example.com/playlist.m3u8' });

      cleanup();
    });
  });

  describe('syncPreloadAttribute', () => {
    it('syncs preload from mediaElement to state', () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      interface Owners {
        mediaElement?: MediaElementLike | undefined;
      }

      const state = createState<State>({
        presentation: undefined,
        preload: undefined,
      });

      // Start with media element already set
      const video = { preload: 'auto' } as PlatformOwners['mediaElement'];
      const owners = createState<Owners>({
        mediaElement: video,
      });

      // Sync should pick up existing mediaElement on subscription
      const cleanup = syncPreloadAttribute(state, owners);

      expect(state.current.preload).toBe('auto');

      cleanup();
    });

    it('updates preload when mediaElement preload changes', () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      interface Owners {
        mediaElement?: MediaElementLike | undefined;
      }

      const state = createState<State>({
        presentation: undefined,
        preload: undefined,
      });

      const video = { preload: 'auto' } as PlatformOwners['mediaElement'];
      const owners = createState<Owners>({
        mediaElement: video,
      });

      // Start syncing
      const cleanup = syncPreloadAttribute(state, owners);

      expect(state.current.preload).toBe('auto');

      // Change to different mediaElement with different preload
      const updatedVideo = { preload: 'metadata' } as PlatformOwners['mediaElement'];
      owners.patch({ mediaElement: updatedVideo });
      owners.flush(); // Flush owners to trigger subscription
      state.flush(); // Flush state to apply preload update

      expect(state.current.preload).toBe('metadata');

      cleanup();
    });

    it('sets preload to undefined when mediaElement is removed', () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      interface Owners {
        mediaElement?: MediaElementLike | undefined;
      }

      const state = createState<State>({
        presentation: undefined,
        preload: 'auto',
      });

      const owners = createState<Owners>({
        mediaElement: undefined,
      });

      const cleanup = syncPreloadAttribute(state, owners);

      // Remove media element
      owners.patch({ mediaElement: undefined });

      expect(state.current.preload).toBeUndefined();

      cleanup();
    });
  });

  describe('deduplication', () => {
    it('does not trigger multiple fetches for same presentation', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = createState<State>({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'auto',
      });

      const events = createEventStream<PresentationAction>();
      const cleanup = resolvePresentation({ state, events });

      // Prime combineLatest and trigger first resolution
      events.dispatch({ type: 'pause' });

      // Rapidly dispatch more events while resolution is in progress
      events.dispatch({ type: 'play' });
      events.dispatch({ type: 'pause' });
      events.dispatch({ type: 'play' });

      // Wait for resolution
      await vi.waitFor(() => {
        expect(state.current.presentation).toHaveProperty('id');
      });

      // Should only fetch once despite multiple events
      expect(fetchSpy).toHaveBeenCalledOnce();

      cleanup();
    });

    it('allows resolving different presentations sequentially', async () => {
      interface State {
        presentation?: AddressableObject | Presentation | undefined;
        preload?: 'auto' | 'metadata' | 'none' | undefined;
      }

      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
        async () =>
          new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = createState<State>({
        presentation: { url: 'http://example.com/first.m3u8' },
        preload: 'auto',
      });

      const events = createEventStream<PresentationAction>();
      const cleanup = resolvePresentation({ state, events });

      events.dispatch({ type: 'pause' });

      // Wait for first resolution
      await vi.waitFor(() => {
        expect(state.current.presentation).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      // Now load a different presentation
      state.patch({ presentation: { url: 'http://example.com/second.m3u8' } });

      // Wait for second resolution
      await vi.waitFor(() => {
        const pres = state.current.presentation as Presentation;
        expect(pres.url).toBe('http://example.com/second.m3u8');
      });

      // Should have fetched twice (different URLs)
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      cleanup();
    });
  });
});

describe('shouldResolve', () => {
  it('returns true when preload is "auto"', () => {
    const result = shouldResolve(
      { presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'auto' },
      { type: 'pause' }
    );

    expect(result).toBe(true);
  });

  it('returns true when preload is "metadata"', () => {
    const result = shouldResolve(
      { presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'metadata' },
      { type: 'pause' }
    );

    expect(result).toBe(true);
  });

  it('returns true on PLAY event when preload is "none"', () => {
    const result = shouldResolve(
      { presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'none' },
      { type: 'play' }
    );

    expect(result).toBe(true);
  });

  it('returns false on non-PLAY event when preload is "none"', () => {
    const result = shouldResolve(
      { presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'none' },
      { type: 'pause' }
    );

    expect(result).toBe(false);
  });

  it('returns false when preload is undefined', () => {
    const result = shouldResolve(
      { presentation: { url: 'http://example.com/playlist.m3u8' }, preload: undefined },
      { type: 'pause' }
    );

    expect(result).toBe(false);
  });

  it('returns false on LOAD event when preload is "none"', () => {
    const result = shouldResolve(
      { presentation: { url: 'http://example.com/playlist.m3u8' }, preload: 'none' },
      { type: 'load', url: 'http://example.com/other.m3u8' }
    );

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
