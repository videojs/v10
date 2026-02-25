import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation, Segment, TextTrack } from '../../../core/types';
import {
  canLoadTextTrackCues,
  loadTextTrackCues,
  shouldLoadTextTrackCues,
  type TextTrackCueLoadingOwners,
  type TextTrackCueLoadingState,
} from '../load-text-track-cues';

// Mock parseVttSegment
vi.mock('../../text/parse-vtt-segment', () => ({
  parseVttSegment: vi.fn((url: string) => {
    if (url.includes('fail')) {
      return Promise.reject(new Error('Failed to load'));
    }
    return Promise.resolve([new VTTCue(0, 5, `Subtitle from ${url}`)]);
  }),
  destroyVttParser: vi.fn(),
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

describe('canLoadTextTrackCues', () => {
  it('returns false when no selected track', () => {
    const state: TextTrackCueLoadingState = {
      presentation: createMockPresentation([]),
    };
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map(),
    };

    expect(canLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns false when no track elements', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([]),
    };
    const owners: TextTrackCueLoadingOwners = {};

    expect(canLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns false when track element does not exist for selected track', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([]),
    };
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map(),
    };

    expect(canLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns true when track selected and elements exist', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([]),
    };
    const trackElement = document.createElement('track');
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    expect(canLoadTextTrackCues(state, owners)).toBe(true);
  });
});

describe('shouldLoadTextTrackCues', () => {
  it('returns false when track not resolved', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          // No segments = not resolved
        },
      ]),
    };
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    expect(shouldLoadTextTrackCues(state, owners)).toBe(false);
  });

  // Note: "returns false when cues already loaded" was removed — with forward
  // buffer windowing, existing cues don't prevent loading new in-window segments.

  it('returns true when track resolved and no cues', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    };
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    expect(shouldLoadTextTrackCues(state, owners)).toBe(true);
  });
});

describe('loadTextTrackCues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: We cannot test actual cue addition in unit tests because the vitest
  // browser environment clears manually added cues after async operations.
  // These tests verify the orchestration logic and that parseVttSegment is called.

  describe('cue deduplication', () => {
    // Deduplication checks textTrack.cues directly. Since the vitest browser
    // environment clears cues after async operations, we override addCue and the
    // cues getter to maintain a persistent list across awaits for these tests.
    function makeTrackWithPersistentCues() {
      const trackElement = document.createElement('track');
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

      return { trackElement, addCueSpy };
    }

    it('adds all cues when there are no duplicates', async () => {
      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      vi.mocked(parseVttSegment)
        .mockResolvedValueOnce([new VTTCue(0, 5, 'Cue A')])
        .mockResolvedValueOnce([new VTTCue(5, 10, 'Cue B')])
        .mockResolvedValueOnce([new VTTCue(10, 15, 'Cue C')]);

      const { trackElement, addCueSpy } = makeTrackWithPersistentCues();

      const state = createState<TextTrackCueLoadingState>({
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(3) }]),
      });
      const owners = createState<TextTrackCueLoadingOwners>({
        textTracks: new Map([['text-1', trackElement]]),
      });

      const cleanup = loadTextTrackCues({ state, owners });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(addCueSpy).toHaveBeenCalledTimes(3);
      cleanup();
    });

    it('drops a duplicate cue from a subsequent segment', async () => {
      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      // Boundary-spanning cue appears in both adjacent segments per HLS spec
      vi.mocked(parseVttSegment)
        .mockResolvedValueOnce([new VTTCue(8, 12, 'Boundary cue')])
        .mockResolvedValueOnce([new VTTCue(8, 12, 'Boundary cue')]);

      const { trackElement, addCueSpy } = makeTrackWithPersistentCues();

      const state = createState<TextTrackCueLoadingState>({
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
      });
      const owners = createState<TextTrackCueLoadingOwners>({
        textTracks: new Map([['text-1', trackElement]]),
      });

      const cleanup = loadTextTrackCues({ state, owners });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(addCueSpy).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('keeps cues with identical timing but different text', async () => {
      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      vi.mocked(parseVttSegment)
        .mockResolvedValueOnce([new VTTCue(0, 5, 'Hello')])
        .mockResolvedValueOnce([new VTTCue(0, 5, 'World')]); // same timing, different text — not a duplicate

      const { trackElement, addCueSpy } = makeTrackWithPersistentCues();

      const state = createState<TextTrackCueLoadingState>({
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
      });
      const owners = createState<TextTrackCueLoadingOwners>({
        textTracks: new Map([['text-1', trackElement]]),
      });

      const cleanup = loadTextTrackCues({ state, owners });
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(addCueSpy).toHaveBeenCalledTimes(2);
      cleanup();
    });

    it('handles mixed: boundary duplicate dropped, unique cues kept', async () => {
      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      vi.mocked(parseVttSegment)
        .mockResolvedValueOnce([new VTTCue(0, 8, 'Unique to seg 0'), new VTTCue(8, 12, 'Boundary cue')])
        .mockResolvedValueOnce([new VTTCue(8, 12, 'Boundary cue'), new VTTCue(12, 20, 'Unique to seg 1')]);

      const { trackElement, addCueSpy } = makeTrackWithPersistentCues();

      const state = createState<TextTrackCueLoadingState>({
        selectedTextTrackId: 'text-1',
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(2) }]),
      });
      const owners = createState<TextTrackCueLoadingOwners>({
        textTracks: new Map([['text-1', trackElement]]),
      });

      const cleanup = loadTextTrackCues({ state, owners });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 3 unique cues — boundary cue added only once
      expect(addCueSpy).toHaveBeenCalledTimes(3);
      cleanup();
    });
  });

  it('does nothing when track not selected', async () => {
    const state = createState<TextTrackCueLoadingState>({
      presentation: createMockPresentation([]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map(),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).not.toHaveBeenCalled();

    cleanup();
  });

  it('triggers loading for single segment', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-1', trackElement]]),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).toHaveBeenCalledTimes(1);
    expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-0.vtt');

    cleanup();
  });

  it('triggers loading for multiple segments', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(3),
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-1', trackElement]]),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).toHaveBeenCalledTimes(3);
    expect(parseVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/segment-1.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

    cleanup();
  });

  // Note: the "skips when cues already loaded" test was removed — with forward
  // buffer windowing, the orchestrator now re-evaluates on each currentTime change.
  // Re-loading is prevented by the loadedSegmentIds set in the closure, not DOM cues.

  it('continues on segment error (partial loading)', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const state = createState<TextTrackCueLoadingState>({
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
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-1', trackElement]]),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    // Verify all segments were attempted
    expect(parseVttSegment).toHaveBeenCalledTimes(3);
    expect(parseVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/fail.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

    // Verify error was logged for the failing segment
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load VTT segment'),
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
    cleanup();
  });

  it('does nothing when track not in presentation', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-999',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-999', trackElement]]),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).not.toHaveBeenCalled();

    cleanup();
  });

  describe('forward buffer windowing', () => {
    // 5 segments × 10s = 50s total. Default buffer window = 30s.
    // At t=0: window [0, 30) covers seg-0..seg-2; seg-3 (start=30) and seg-4 excluded.
    // At t=15: window [15, 45) adds seg-3 (start=30) and seg-4 (start=40).
    function makeWindowingSetup(currentTime = 0) {
      const trackElement = document.createElement('track');
      const video = document.createElement('video');
      video.appendChild(trackElement);
      trackElement.track.mode = 'hidden';

      const state = createState<TextTrackCueLoadingState>({
        selectedTextTrackId: 'text-1',
        currentTime,
        presentation: createMockPresentation([
          {
            id: 'text-1',
            segments: createMockSegments(5), // 5 × 10s segments: 0,10,20,30,40
          },
        ]),
      });
      const owners = createState<TextTrackCueLoadingOwners>({
        textTracks: new Map([['text-1', trackElement]]),
      });

      return { state, owners, trackElement };
    }

    it('only fetches segments within the forward buffer window at the initial position', async () => {
      const { state, owners } = makeWindowingSetup(0);
      const cleanup = loadTextTrackCues({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      // Window [0, 30): seg-0 (0s), seg-1 (10s), seg-2 (20s) — seg-3 starts at 30 (excluded)
      expect(parseVttSegment).toHaveBeenCalledTimes(3);
      expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-0.vtt');
      expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-1.vtt');
      expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-2.vtt');
      expect(parseVttSegment).not.toHaveBeenCalledWith('https://example.com/segment-3.vtt');
      expect(parseVttSegment).not.toHaveBeenCalledWith('https://example.com/segment-4.vtt');

      cleanup();
    });

    it('fetches new in-window segments when currentTime advances', async () => {
      const { state, owners } = makeWindowingSetup(0);
      const cleanup = loadTextTrackCues({ state, owners });

      // Wait for initial window load (seg-0..seg-2)
      await new Promise((resolve) => setTimeout(resolve, 50));

      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      expect(parseVttSegment).toHaveBeenCalledTimes(3);

      // Advance currentTime so seg-3 and seg-4 enter the window [15, 45)
      state.patch({ currentTime: 15 });

      await vi.waitFor(() => {
        expect(parseVttSegment).toHaveBeenCalledTimes(5);
      });

      expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-3.vtt');
      expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-4.vtt');

      cleanup();
    });

    it('does not re-fetch already-loaded segments when the window advances', async () => {
      const { state, owners } = makeWindowingSetup(0);
      const cleanup = loadTextTrackCues({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      const callsBefore = (parseVttSegment as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(callsBefore).toContain('https://example.com/segment-0.vtt');

      state.patch({ currentTime: 15 });
      await vi.waitFor(() => {
        expect(parseVttSegment).toHaveBeenCalledTimes(5);
      });

      // seg-0..seg-2 should each appear exactly once across all calls
      const allCalls = (parseVttSegment as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-0.vtt')).toHaveLength(1);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-1.vtt')).toHaveLength(1);
      expect(allCalls.filter((u) => u === 'https://example.com/segment-2.vtt')).toHaveLength(1);

      cleanup();
    });

    it('fetches all segments immediately when the track fits in one window', async () => {
      const { state, owners } = makeWindowingSetup(0);
      // Override to a 3-segment track (0,10,20) — all fit in [0,30)
      state.patch({
        presentation: createMockPresentation([{ id: 'text-1', segments: createMockSegments(3) }]),
      });

      const cleanup = loadTextTrackCues({ state, owners });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const { parseVttSegment } = await import('../../text/parse-vtt-segment');
      expect(parseVttSegment).toHaveBeenCalledTimes(3);

      cleanup();
    });
  });
});
