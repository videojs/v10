import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import { resolveVttSegment } from '../../../../media/dom/text/resolve-vtt-segment';
import type { Presentation, Segment, TextTrack } from '../../../../media/types';
import {
  loadTextTrackCues,
  type TextTrackCueLoadingOwners,
  type TextTrackCueLoadingState,
} from '../../load-text-track-cues';
import { setupTextTrackActors, type TextTrackActorsOwners } from '../setup-text-track-actors';

// The composed behaviors (setup in dom + loader in media) intersect their
// owner-shape contracts. The setup narrows `mediaElement` to
// `HTMLMediaElement`; the loader keeps the abstract actor types. The test
// signal has to satisfy both.
type ComposedOwners = TextTrackCueLoadingOwners & TextTrackActorsOwners;

// Mock resolveVttSegment
vi.mock('../../../../media/dom/text/resolve-vtt-segment', () => ({
  resolveVttSegment: vi.fn((url: string) => {
    if (url.includes('fail')) {
      return Promise.reject(new Error('Failed to load'));
    }
    return Promise.resolve([new VTTCue(0, 5, `Subtitle from ${url}`)]);
  }),
  destroyVttResolver: vi.fn(),
}));

function createMockPresentation(tracks: Partial<TextTrack>[]): Presentation {
  return {
    url: 'https://example.com/playlist.m3u8',
    selectionSets: [
      {
        type: 'text',
        switchingSets: [
          {
            tracks: tracks.map((t) => ({
              id: t.id || 'text-1',
              type: 'text' as const,
              url: t.url || 'https://example.com/text.m3u8',
              mimeType: 'text/vtt',
              bandwidth: 0,
              groupId: 'subs',
              label: t.label || 'English',
              kind: (t.kind || 'subtitles') as 'subtitles' | 'captions',
              language: t.language || 'en',
              segments: t.segments || [],
              ...t,
            })),
          },
        ],
      },
    ],
  } as Presentation;
}

function createMockSegments(count: number): Segment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `segment-${i}`,
    url: `https://example.com/segment-${i}.vtt`,
    duration: 10,
    startTime: i * 10,
  }));
}

/**
 * Sets up the composition of `setupTextTrackActors` (DOM-side actor
 * setup) and `loadTextTrackCues` (host-agnostic orchestrator). Returns
 * the composed reactive channels and a combined cleanup.
 */
function setupLoadTextTrackCues(initialState: TextTrackCueLoadingState, initialOwners: ComposedOwners) {
  const state = signal<TextTrackCueLoadingState>(initialState);
  const owners = signal<ComposedOwners>(initialOwners);
  const setupCleanup = setupTextTrackActors({ owners, config: { resolveTextTrackSegment: resolveVttSegment } });
  const reactor = loadTextTrackCues({ state, owners });
  const cleanup = () => {
    reactor.destroy();
    setupCleanup();
  };
  return { state, owners, cleanup };
}

describe('loadTextTrackCues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: We cannot test actual cue addition in unit tests because the vitest
  // browser environment clears manually added cues after async operations.
  // These tests verify the orchestration logic and that resolveVttSegment is called.

  describe('cue deduplication', () => {
    // Deduplication checks textTrack.cues directly. Since the vitest browser
    // environment clears cues after async operations, we override addCue and the
    // cues getter to maintain a persistent list across awaits for these tests.
    function makeTrackWithPersistentCues() {
      const trackElement = document.createElement('track');
      trackElement.id = 'text-1';
      const video = document.createElement('video');
      video.appendChild(trackElement);
      trackElement.track.mode = 'hidden';

      const persistedCues: VTTCue[] = [];

      const addCueSpy = vi.spyOn(trackElement.track, 'addCue').mockImplementation((cue) => {
        persistedCues.push(cue as VTTCue);
      });

      Object.defineProperty(trackElement.track, 'cues', {
        get: () =>
          Object.assign(persistedCues, {
            item: (i: number) => persistedCues[i] ?? null,
          }) as unknown as TextTrackCueList,
        configurable: true,
      });

      return { trackElement, video, addCueSpy };
    }

    it('adds all cues when there are no duplicates', async () => {
      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      vi.mocked(resolveVttSegment)
        .mockResolvedValueOnce([new VTTCue(0, 5, 'Cue A')])
        .mockResolvedValueOnce([new VTTCue(5, 10, 'Cue B')])
        .mockResolvedValueOnce([new VTTCue(10, 15, 'Cue C')]);

      const { video, addCueSpy } = makeTrackWithPersistentCues();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(3) }]),
        },
        { mediaElement: video }
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(addCueSpy).toHaveBeenCalledTimes(3);
      cleanup();
    });

    it('drops a duplicate cue from a subsequent segment', async () => {
      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      // Boundary-spanning cue appears in both adjacent segments per HLS spec
      vi.mocked(resolveVttSegment)
        .mockResolvedValueOnce([new VTTCue(8, 12, 'Boundary cue')])
        .mockResolvedValueOnce([new VTTCue(8, 12, 'Boundary cue')]);

      const { video, addCueSpy } = makeTrackWithPersistentCues();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
        },
        { mediaElement: video }
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(addCueSpy).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('keeps cues with identical timing but different text', async () => {
      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      vi.mocked(resolveVttSegment)
        .mockResolvedValueOnce([new VTTCue(0, 5, 'Hello')])
        .mockResolvedValueOnce([new VTTCue(0, 5, 'World')]); // same timing, different text — not a duplicate

      const { video, addCueSpy } = makeTrackWithPersistentCues();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
        },
        { mediaElement: video }
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(addCueSpy).toHaveBeenCalledTimes(2);
      cleanup();
    });

    it('handles mixed: boundary duplicate dropped, unique cues kept', async () => {
      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      vi.mocked(resolveVttSegment)
        .mockResolvedValueOnce([new VTTCue(0, 8, 'Unique to seg 0'), new VTTCue(8, 12, 'Boundary cue')])
        .mockResolvedValueOnce([new VTTCue(8, 12, 'Boundary cue'), new VTTCue(12, 20, 'Unique to seg 1')]);

      const { video, addCueSpy } = makeTrackWithPersistentCues();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
        },
        { mediaElement: video }
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 3 unique cues — boundary cue added only once
      expect(addCueSpy).toHaveBeenCalledTimes(3);
      cleanup();
    });
  });

  it('does nothing when track not selected', async () => {
    const { cleanup } = setupLoadTextTrackCues({ presentation: createMockPresentation([]) }, {});

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
    expect(resolveVttSegment).not.toHaveBeenCalled();

    cleanup();
  });

  it('triggers loading for single segment', async () => {
    const trackElement = document.createElement('track');
    trackElement.id = 'text-1';
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const { cleanup } = setupLoadTextTrackCues(
      {
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(1) }]),
      },
      { mediaElement: video }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
    expect(resolveVttSegment).toHaveBeenCalledTimes(1);
    expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-0.vtt');

    cleanup();
  });

  it('triggers loading for multiple segments', async () => {
    const trackElement = document.createElement('track');
    trackElement.id = 'text-1';
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const { cleanup } = setupLoadTextTrackCues(
      {
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(3) }]),
      },
      { mediaElement: video }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
    expect(resolveVttSegment).toHaveBeenCalledTimes(3);
    expect(resolveVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(resolveVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/segment-1.vtt');
    expect(resolveVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

    cleanup();
  });

  // Note: the "skips when cues already loaded" test was removed — with forward
  // buffer windowing, the orchestrator now re-evaluates on each currentTime change.
  // Re-loading is prevented by the loadedSegmentIds set in the closure, not DOM cues.

  it('continues on segment error (partial loading)', async () => {
    const trackElement = document.createElement('track');
    trackElement.id = 'text-1';
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { cleanup } = setupLoadTextTrackCues(
      {
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([
          {
            id: 'text-1',
            segments: [
              { id: 'seg-0', url: 'https://example.com/segment-0.vtt', duration: 10, startTime: 0 },
              { id: 'seg-1', url: 'https://example.com/fail.vtt', duration: 10, startTime: 10 },
              { id: 'seg-2', url: 'https://example.com/segment-2.vtt', duration: 10, startTime: 20 },
            ] as Segment[],
          },
        ]),
      },
      { mediaElement: video }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
    // Verify all segments were attempted
    expect(resolveVttSegment).toHaveBeenCalledTimes(3);
    expect(resolveVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(resolveVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/fail.vtt');
    expect(resolveVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

    // Verify error was logged for the failing segment
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load text-track segment'),
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
    cleanup();
  });

  it('does nothing when track not in presentation', async () => {
    const trackElement = document.createElement('track');
    trackElement.id = 'text-999';
    const video = document.createElement('video');
    video.appendChild(trackElement);

    const { cleanup } = setupLoadTextTrackCues(
      {
        selectedTextTrackId: 'text-999',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(1) }]),
      },
      { mediaElement: video }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
    expect(resolveVttSegment).not.toHaveBeenCalled();

    cleanup();
  });

  describe('forward buffer windowing', () => {
    // 5 segments × 10s = 50s total. Default buffer window = 30s.
    // At t=0: window [0, 30) covers seg-0..seg-2; seg-3 (start=30) and seg-4 excluded.
    // At t=15: window [15, 45) adds seg-3 (start=30) and seg-4 (start=40).
    function makeWindowingSetup(currentTime = 0) {
      const trackElement = document.createElement('track');
      trackElement.id = 'text-1';
      const video = document.createElement('video');
      video.appendChild(trackElement);
      trackElement.track.mode = 'hidden';

      const { state, owners, cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          currentTime,
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(5) }]),
        },
        { mediaElement: video }
      );

      return { state, owners, cleanup, trackElement };
    }

    it('only fetches segments within the forward buffer window at the initial position', async () => {
      const { cleanup } = makeWindowingSetup(0);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      // Window [0, 30): seg-0 (0s), seg-1 (10s), seg-2 (20s) — seg-3 starts at 30 (excluded)
      expect(resolveVttSegment).toHaveBeenCalledTimes(3);
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-0.vtt');
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-1.vtt');
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-2.vtt');
      expect(resolveVttSegment).not.toHaveBeenCalledWith('https://example.com/segment-3.vtt');
      expect(resolveVttSegment).not.toHaveBeenCalledWith('https://example.com/segment-4.vtt');

      cleanup();
    });

    it('fetches new in-window segments when currentTime advances', async () => {
      const { state, cleanup } = makeWindowingSetup(0);

      // Wait for initial window load (seg-0..seg-2)
      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).toHaveBeenCalledTimes(3);

      // Advance currentTime so seg-3 and seg-4 enter the window [15, 45)
      state.set({ ...state.get(), currentTime: 15 });

      await vi.waitFor(() => {
        expect(resolveVttSegment).toHaveBeenCalledTimes(5);
      });

      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-3.vtt');
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-4.vtt');

      cleanup();
    });

    it('does not re-fetch already-loaded segments when the window advances', async () => {
      const { state, cleanup } = makeWindowingSetup(0);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      const callsBefore = (resolveVttSegment as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(callsBefore).toContain('https://example.com/segment-0.vtt');

      state.set({ ...state.get(), currentTime: 15 });
      await vi.waitFor(() => {
        expect(resolveVttSegment).toHaveBeenCalledTimes(5);
      });

      // seg-0..seg-2 should each appear exactly once across all calls
      const allCalls = (resolveVttSegment as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-0.vtt')).toHaveLength(1);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-1.vtt')).toHaveLength(1);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-2.vtt')).toHaveLength(1);

      cleanup();
    });

    it('fetches all segments immediately when the track fits in one window', async () => {
      // 3 segments × 10s = 30s total — all fit in the default [0, 30) window.
      // Set up directly with 3 segments so no preemption from a prior 5-segment load.
      const trackElement = document.createElement('track');
      trackElement.id = 'text-1';
      const video = document.createElement('video');
      video.appendChild(trackElement);
      trackElement.track.mode = 'hidden';

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          currentTime: 0,
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(3) }]),
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).toHaveBeenCalledTimes(3);
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-0.vtt');
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-1.vtt');
      expect(resolveVttSegment).toHaveBeenCalledWith('https://example.com/segment-2.vtt');

      cleanup();
    });
  });
});
