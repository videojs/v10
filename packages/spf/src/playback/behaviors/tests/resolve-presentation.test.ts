import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation } from '../../../media/types';
import { type PresentationState, resolvePresentation, shouldResolve } from '../resolve-presentation';

function makeState(initial: PresentationState = {}): StateSignals<PresentationState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    preload: signal<'auto' | 'metadata' | 'none' | undefined>(initial.preload),
    playbackInitiated: signal<boolean | undefined>(initial.playbackInitiated),
  };
}

describe('resolvePresentation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves unresolved presentation', async () => {
    const state = makeState({ preload: 'auto' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000
variant2.m3u8`)
    );

    const reactor = resolvePresentation({ state });

    state.presentation.set({ url: 'http://example.com/playlist.m3u8' });

    await vi.waitFor(() => {
      const pres = state.presentation.get();
      expect(pres).toBeDefined();
      expect(pres).toHaveProperty('id');
      expect(pres).toHaveProperty('selectionSets');
    });

    const resolved = state.presentation.get() as Presentation;
    expect(resolved.url).toBe('http://example.com/playlist.m3u8');
    expect(resolved.selectionSets).toBeDefined();
    expect(resolved.selectionSets.length).toBeGreaterThan(0);

    const videoSet = resolved.selectionSets.find((s) => s.type === 'video');
    expect(videoSet).toBeDefined();
    expect(videoSet!.switchingSets).toBeDefined();
    expect(videoSet!.switchingSets[0]?.tracks.length).toBeGreaterThan(0);

    reactor.destroy();
  });

  it('does not trigger resolution when other state fields change', async () => {
    // The new discrete-signals shape eliminates the "any unrelated field
    // change re-runs the effect" footgun by construction — each derived
    // computed only tracks the signals it reads. This test is preserved as
    // a behavioural assertion: only `presentation` triggers fetch.
    const state = makeState({ preload: 'auto' });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
    );

    const reactor = resolvePresentation({ state });

    // No URL yet — flipping preload shouldn't trigger fetch.
    state.preload.set('metadata');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();

    state.presentation.set({ url: 'http://example.com/playlist.m3u8' });

    await vi.waitFor(() => {
      expect(state.presentation.get()).toHaveProperty('id');
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    // Flipping preload after resolution shouldn't re-fetch.
    state.preload.set('auto');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('resolves presentation initialized as unresolved', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
    );

    const state = makeState({
      presentation: { url: 'http://example.com/initial.m3u8' },
      preload: 'auto',
    });

    const reactor = resolvePresentation({ state });

    await vi.waitFor(() => {
      const pres = state.presentation.get();
      expect(pres).toHaveProperty('id');
      expect(pres).toHaveProperty('selectionSets');
    });

    const resolved = state.presentation.get() as Presentation;
    expect(resolved.url).toBe('http://example.com/initial.m3u8');
    expect(resolved.selectionSets).toBeDefined();

    reactor.destroy();
  });

  it('does not re-resolve presentation initialized as resolved', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

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

    const state = makeState({ presentation: resolvedPresentation, preload: 'auto' });

    const reactor = resolvePresentation({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.presentation.get()).toBe(resolvedPresentation);

    reactor.destroy();
  });

  it('resolves new unresolved presentation after resolved one', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=2000000
variant2.m3u8`)
    );

    const resolvedPresentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/first.m3u8',
      selectionSets: [],
      startTime: 0,
    };

    const state = makeState({ presentation: resolvedPresentation, preload: 'auto' });

    const reactor = resolvePresentation({ state });

    state.presentation.set({ url: 'http://example.com/second.m3u8' });

    await vi.waitFor(() => {
      const pres = state.presentation.get();
      expect(pres).toHaveProperty('id');
      expect((pres as Presentation).url).toBe('http://example.com/second.m3u8');
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const resolved = state.presentation.get() as Presentation;
    expect(resolved.url).toBe('http://example.com/second.m3u8');
    expect(resolved.selectionSets).toBeDefined();

    reactor.destroy();
  });

  describe('preload policy', () => {
    it('resolves when preload is "auto"', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'auto',
      });

      const reactor = resolvePresentation({ state });

      await vi.waitFor(() => {
        expect(state.presentation.get()).toHaveProperty('id');
      });

      reactor.destroy();
    });

    it('resolves when preload is "metadata"', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'metadata',
      });

      const reactor = resolvePresentation({ state });

      await vi.waitFor(() => {
        expect(state.presentation.get()).toHaveProperty('id');
      });

      reactor.destroy();
    });

    it('does not resolve when preload is "none"', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const reactor = resolvePresentation({ state });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.presentation.get()).toBeUndefined();
      expect(state.presentation.get()?.url).toBe('http://example.com/playlist.m3u8');

      reactor.destroy();
    });

    it('does not resolve when preload is undefined', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
      });

      const reactor = resolvePresentation({ state });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.presentation.get()).toBeUndefined();
      expect(state.presentation.get()?.url).toBe('http://example.com/playlist.m3u8');

      reactor.destroy();
    });
  });

  describe('playbackInitiated resolution', () => {
    it('resolves when playbackInitiated is set to true with preload "none"', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const reactor = resolvePresentation({ state });

      expect(fetchSpy).not.toHaveBeenCalled();

      state.playbackInitiated.set(true);

      await vi.waitFor(() => {
        expect(state.presentation.get()).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      reactor.destroy();
    });

    it('does not resolve when playbackInitiated is false with preload "none"', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'none',
      });

      const reactor = resolvePresentation({ state });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(state.presentation.get()).toBeUndefined();
      expect(state.presentation.get()?.url).toBe('http://example.com/playlist.m3u8');

      reactor.destroy();
    });
  });

  describe('deduplication', () => {
    it('does not trigger multiple fetches for same presentation', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = makeState({
        presentation: { url: 'http://example.com/playlist.m3u8' },
        preload: 'auto',
      });

      const reactor = resolvePresentation({ state });

      // Rapid no-op updates — preload doesn't change semantically.
      state.preload.set('auto');
      state.preload.set('auto');

      await vi.waitFor(() => {
        expect(state.presentation.get()).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      reactor.destroy();
    });

    it('allows resolving different presentations sequentially', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
          new Response(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000000
variant1.m3u8`)
      );

      const state = makeState({
        presentation: { url: 'http://example.com/first.m3u8' },
        preload: 'auto',
      });

      const reactor = resolvePresentation({ state });

      await vi.waitFor(() => {
        expect(state.presentation.get()).toHaveProperty('id');
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      state.presentation.set({ url: 'http://example.com/second.m3u8' });

      await vi.waitFor(() => {
        const pres = state.presentation.get() as Presentation;
        expect(pres).toHaveProperty('id');
        expect(pres.url).toBe('http://example.com/second.m3u8');
      });

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
