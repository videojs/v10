import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import { resolveVttSegment } from '../../../../media/dom/text/resolve-vtt-segment';
import type {
  Cue,
  MaybeResolvedPresentation,
  MediaElementWithTextTracks,
  Presentation,
  Segment,
  TextTrack,
} from '../../../../media/types';
import type { TextTrackSegmentLoaderActor } from '../../../actors/text-track-segment-loader';
import type { TextTracksActor } from '../../../actors/text-tracks';
import { loadTextTrackSegments } from '../load-segments';
import { setupTextTrackActors, type TextTrackActorsContext } from '../setup-text-track-actors';

// Local narrow type aliases — the text-specific slice of the
// `SegmentLoadingState` / `SegmentLoadingContext` shapes that
// `loadTextTrackSegments` (now defined in `load-segments.ts`) consumes.
interface TextTrackSegmentLoadingState {
  selectedTextTrackId?: string;
  presentation?: MaybeResolvedPresentation;
  currentTime?: number;
  preload?: string;
  loadActivated?: boolean;
}

interface TextTrackSegmentLoadingContext {
  textTrackSegmentLoaderActor?: TextTrackSegmentLoaderActor | undefined;
}

// The composed behaviors (setup in dom + loader in media) intersect their
// context-shape contracts. The setup narrows `mediaElement` to
// `HTMLMediaElement`; the loader keeps the abstract actor types. The test
// signal map has to satisfy both.
type ComposedContext = TextTrackSegmentLoadingContext & TextTrackActorsContext;

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

function makeState(initial: TextTrackSegmentLoadingState = {}): StateSignals<TextTrackSegmentLoadingState> {
  return {
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    currentTime: signal<number | undefined>(initial.currentTime),
    preload: signal<string | undefined>(initial.preload),
    loadActivated: signal<boolean | undefined>(initial.loadActivated),
  };
}

function makeContext(initial: ComposedContext = {}): ContextSignals<ComposedContext> {
  return {
    mediaElement: signal<(MediaElementWithTextTracks & HTMLMediaElement) | undefined>(
      initial.mediaElement as (MediaElementWithTextTracks & HTMLMediaElement) | undefined
    ) as ContextSignals<ComposedContext>['mediaElement'],
    textTracksActor: signal<TextTracksActor<VTTCue & Cue> | undefined>(
      initial.textTracksActor as TextTracksActor<VTTCue & Cue> | undefined
    ) as ContextSignals<ComposedContext>['textTracksActor'],
    textTrackSegmentLoaderActor: signal<TextTrackSegmentLoaderActor | undefined>(initial.textTrackSegmentLoaderActor),
  };
}

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

function setupLoadTextTrackCues(initialState: TextTrackSegmentLoadingState, initialContext: ComposedContext) {
  // Default to `preload: 'auto'` so existing tests (which pre-date the
  // FSM and assume loading-is-on) still exercise the load path. Tests
  // targeting dormant / activation behavior override this explicitly.
  const state = makeState({ preload: 'auto', ...initialState });
  const context = makeContext(initialContext);
  const setupCleanup = setupTextTrackActors.setup({ context, config: { resolveTextTrackSegment: resolveVttSegment } });
  const reactor = loadTextTrackSegments.setup({ state, context });
  const cleanup = () => {
    reactor.destroy();
    setupCleanup();
  };
  return { state, context, cleanup };
}

describe('loadTextTrackSegments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cue deduplication', () => {
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
        .mockResolvedValueOnce([new VTTCue(0, 5, 'World')]);

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
    trackElement.track.mode = 'hidden';

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
    trackElement.track.mode = 'hidden';

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

  it('continues on segment error (partial loading)', async () => {
    const trackElement = document.createElement('track');
    trackElement.id = 'text-1';
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden';

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
    expect(resolveVttSegment).toHaveBeenCalledTimes(3);
    expect(resolveVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(resolveVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/fail.vtt');
    expect(resolveVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

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
    function makeWindowingSetup(currentTime = 0) {
      const trackElement = document.createElement('track');
      trackElement.id = 'text-1';
      const video = document.createElement('video');
      video.appendChild(trackElement);
      trackElement.track.mode = 'hidden';

      const { state, context, cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          currentTime,
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(5) }]),
        },
        { mediaElement: video }
      );

      return { state, context, cleanup, trackElement };
    }

    it('only fetches segments within the forward buffer window at the initial position', async () => {
      const { cleanup } = makeWindowingSetup(0);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
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

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).toHaveBeenCalledTimes(3);

      state.currentTime.set(15);

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

      state.currentTime.set(15);
      await vi.waitFor(() => {
        expect(resolveVttSegment).toHaveBeenCalledTimes(5);
      });

      const allCalls = (resolveVttSegment as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-0.vtt')).toHaveLength(1);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-1.vtt')).toHaveLength(1);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-2.vtt')).toHaveLength(1);

      cleanup();
    });

    it('fetches all segments immediately when the track fits in one window', async () => {
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

  // --------------------------------------------------------------------------
  // Load-mode FSM: preconditions-unmet | dormant | full-range
  // --------------------------------------------------------------------------

  describe('load-mode FSM', () => {
    function makeMountedTrack(id = 'text-1') {
      const trackElement = document.createElement('track');
      trackElement.id = id;
      const video = document.createElement('video');
      video.appendChild(trackElement);
      trackElement.track.mode = 'hidden';
      return video;
    }

    it("dormant — preload='none' && !loadActivated: no fetches", async () => {
      const video = makeMountedTrack();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
          preload: 'none',
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).not.toHaveBeenCalled();

      cleanup();
    });

    it("dormant — preload='metadata' && !loadActivated: no fetches (text has no init segment)", async () => {
      const video = makeMountedTrack();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
          preload: 'metadata',
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).not.toHaveBeenCalled();

      cleanup();
    });

    it("full-range — preload='auto' triggers loading immediately", async () => {
      const video = makeMountedTrack();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
          preload: 'auto',
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it("full-range — loadActivated overrides preload='none'", async () => {
      const video = makeMountedTrack();

      const { cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
          preload: 'none',
          loadActivated: true,
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it('transitions dormant → full-range when loadActivated flips true', async () => {
      const video = makeMountedTrack();

      const { state, cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
          preload: 'none',
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      expect(resolveVttSegment).not.toHaveBeenCalled();

      state.loadActivated.set(true);

      await vi.waitFor(() => {
        expect(resolveVttSegment).toHaveBeenCalledTimes(2);
      });

      cleanup();
    });

    it('does not re-dispatch on currentTime ticks within the same segment', async () => {
      const video = makeMountedTrack();

      const { state, cleanup } = setupLoadTextTrackCues(
        {
          selectedTextTrackId: 'text-1',
          currentTime: 0,
          // 5 segments of 10s — initial currentTime=0 → boundary=0
          presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(5) }]),
        },
        { mediaElement: video }
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { resolveVttSegment } = await import('../../../../media/dom/text/resolve-vtt-segment');
      const callsAfterInitial = (resolveVttSegment as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callsAfterInitial).toBeGreaterThan(0);

      // Tick currentTime within segment 0 (boundary stays at 0). Loader
      // should not receive new load messages → no new resolveVttSegment
      // calls.
      state.currentTime.set(2);
      state.currentTime.set(5);
      state.currentTime.set(8);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect((resolveVttSegment as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterInitial);

      cleanup();
    });
  });
});
