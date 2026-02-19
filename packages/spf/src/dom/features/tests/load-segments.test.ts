/**
 * Tests for segment loading orchestration (F4 + F5)
 */

import { describe, expect, it, vi } from 'vitest';
import type { Segment } from '../../../core/types';
import {
  canLoadSegments,
  type SegmentLoadingOwners,
  type SegmentLoadingState,
  shouldLoadSegments,
} from '../load-segments';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSegment(id: string, startTime: number, duration = 10): Segment {
  return { id, url: `http://example.com/${id}.m4s`, startTime, duration };
}

function makeResolvedVideoTrack(segments: Segment[]) {
  return {
    type: 'video' as const,
    id: 'track-1',
    url: 'http://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.42E01E'],
    bandwidth: 1_000_000,
    initialization: { url: 'http://example.com/init.mp4' },
    segments,
    startTime: 0,
    duration: segments.reduce((acc, s) => acc + s.duration, 0),
  };
}

function makeSourceBuffer(): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};

  return {
    buffered: { length: 0, start: () => 0, end: () => 0 },
    updating: false,
    appendBuffer: vi.fn(() => {
      // Dispatch updateend async to satisfy appendSegment's promise
      setTimeout(() => {
        for (const listener of listeners['updateend'] ?? []) {
          listener(new Event('updateend'));
        }
      }, 0);
    }),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] ??= [];
      listeners[type].push(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== listener);
    }),
  } as unknown as SourceBuffer;
}

// ---------------------------------------------------------------------------
// canLoadSegments
// ---------------------------------------------------------------------------

describe('canLoadSegments', () => {
  it('returns false when no video track is selected', () => {
    const state: SegmentLoadingState = { preload: 'auto' };
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    expect(canLoadSegments(state, owners, 'video')).toBe(false);
  });

  it('returns false when no SourceBuffer exists for type', () => {
    const segments = [makeSegment('s1', 0)];
    const state: SegmentLoadingState = {
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 10,
        selectionSets: [
          {
            id: 'ss1',
            type: 'video',
            switchingSets: [{ id: 'sw1', type: 'video', tracks: [makeResolvedVideoTrack(segments)] }],
          },
        ],
      },
    };
    const owners: SegmentLoadingOwners = {};

    expect(canLoadSegments(state, owners, 'video')).toBe(false);
  });

  it('returns true when track is selected and SourceBuffer exists', () => {
    const segments = [makeSegment('s1', 0)];
    const state: SegmentLoadingState = {
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 10,
        selectionSets: [
          {
            id: 'ss1',
            type: 'video',
            switchingSets: [{ id: 'sw1', type: 'video', tracks: [makeResolvedVideoTrack(segments)] }],
          },
        ],
      },
    };
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    expect(canLoadSegments(state, owners, 'video')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// shouldLoadSegments
// ---------------------------------------------------------------------------

describe('shouldLoadSegments', () => {
  const twoSegments = [makeSegment('s1', 0, 10), makeSegment('s2', 10, 10)];

  function makeBaseState(overrides: Partial<SegmentLoadingState> = {}): SegmentLoadingState {
    return {
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 20,
        selectionSets: [
          {
            id: 'ss1',
            type: 'video',
            switchingSets: [{ id: 'sw1', type: 'video', tracks: [makeResolvedVideoTrack(twoSegments)] }],
          },
        ],
      },
      ...overrides,
    };
  }

  it('returns false when preload is not "auto"', () => {
    const state = makeBaseState({ preload: 'metadata' });
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    expect(shouldLoadSegments(state, owners, 'video')).toBe(false);
  });

  it('returns false when no SourceBuffer', () => {
    const state = makeBaseState();
    expect(shouldLoadSegments(state, {}, 'video')).toBe(false);
  });

  it('returns true when buffer window has unloaded segments (no currentTime)', () => {
    const state = makeBaseState();
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    // No currentTime → defaults to 0 → both segments [0-10, 10-20] are in [0, 30s] window
    expect(shouldLoadSegments(state, owners, 'video')).toBe(true);
  });

  it('returns false when all segments in buffer window are already buffered', () => {
    const state = makeBaseState({
      currentTime: 0,
      bufferState: {
        video: {
          initTrackId: 'track-1',
          segments: [
            { id: 's1', trackId: 'track-1' },
            { id: 's2', trackId: 'track-1' },
          ],
        },
      },
    });
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    expect(shouldLoadSegments(state, owners, 'video')).toBe(false);
  });

  it('returns true when currentTime advances and a new segment enters the window', () => {
    // Only s1 is buffered; s2 starts at 10s. currentTime=5, window=[5,35] → s2 needed
    const state = makeBaseState({
      currentTime: 5,
      bufferState: {
        video: {
          initTrackId: 'track-1',
          segments: [{ id: 's1', trackId: 'track-1' }],
        },
      },
    });
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    expect(shouldLoadSegments(state, owners, 'video')).toBe(true);
  });

  it('returns false when currentTime is past all segments (nothing left to buffer)', () => {
    const state = makeBaseState({
      currentTime: 100, // past all content
      bufferState: { video: { initTrackId: 'track-1', segments: [] } },
    });
    const owners: SegmentLoadingOwners = { videoBuffer: makeSourceBuffer() };

    // getSegmentsToLoad: window=[100, 130], no segments overlap → nothing to load
    expect(shouldLoadSegments(state, owners, 'video')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loadSegments orchestration — forward buffer behaviour
// ---------------------------------------------------------------------------

describe('loadSegments orchestration (F5)', () => {
  it('only fetches segments within the buffer window', async () => {
    // 4 segments of 10s each. currentTime=0, bufferDuration=30 → first 3 in window
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10), // outside window at t=0
    ];

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const track = makeResolvedVideoTrack(segments);
    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 40,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    const owners = cs<SegmentLoadingOwners>({
      videoBuffer: makeSourceBuffer(),
    });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => {
      // s1, s2, s3 should be fetched; s4 (starts at 30s, window ends at 30s) should not
      expect(fetchedUrls).toContain('http://example.com/init.mp4');
      expect(fetchedUrls).toContain('http://example.com/s1.m4s');
      expect(fetchedUrls).toContain('http://example.com/s2.m4s');
      expect(fetchedUrls).toContain('http://example.com/s3.m4s');
      expect(fetchedUrls).not.toContain('http://example.com/s4.m4s');
    });

    cleanup();
  });

  it('skips init segment when already loaded for the track', async () => {
    const segments = [makeSegment('s1', 0, 10)];

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const track = makeResolvedVideoTrack(segments);
    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      // Init already loaded for this track
      bufferState: { video: { initTrackId: 'track-1', segments: [] } },
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 10,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: makeSourceBuffer() });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => {
      expect(fetchedUrls).toContain('http://example.com/s1.m4s');
      expect(fetchedUrls).not.toContain('http://example.com/init.mp4');
    });

    cleanup();
  });

  it('loads additional segments when currentTime advances', async () => {
    // 3 segments. Buffer window=30s. Start at t=0 with s1 already buffered.
    // currentTime advances to 5 → s2 and s3 now needed.
    const segments = [makeSegment('s1', 0, 10), makeSegment('s2', 10, 10), makeSegment('s3', 20, 10)];

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const track = makeResolvedVideoTrack(segments);
    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      // s1 already buffered, init already loaded
      bufferState: {
        video: {
          initTrackId: 'track-1',
          segments: [{ id: 's1', trackId: 'track-1' }],
        },
      },
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 30,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: makeSourceBuffer() });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => {
      expect(fetchedUrls).toContain('http://example.com/s2.m4s');
      expect(fetchedUrls).toContain('http://example.com/s3.m4s');
      expect(fetchedUrls).not.toContain('http://example.com/s1.m4s');
      expect(fetchedUrls).not.toContain('http://example.com/init.mp4');
    });

    cleanup();
  });
});

// ---------------------------------------------------------------------------
// Seek handling — pending task + abort
// ---------------------------------------------------------------------------

describe('loadSegments seek handling', () => {
  function makeControllableFetch() {
    const resolvers = new Map<string, () => void>();
    const fetchedUrls: string[] = [];

    const fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return new Promise<Response>((resolve) => {
        resolvers.set(url, () => resolve(new Response(new ArrayBuffer(100))));
      });
    });

    const resolve = (url: string) => resolvers.get(url)?.();
    const resolveAll = () => resolvers.forEach((fn) => fn());

    return { fetch, fetchedUrls, resolve, resolveAll };
  }

  function makePresentation(segments: Segment[]) {
    return {
      id: 'p1',
      url: 'http://example.com/playlist.m3u8',
      startTime: 0,
      duration: segments.reduce((acc, s) => acc + s.duration, 0),
      selectionSets: [
        {
          id: 'ss1',
          type: 'video' as const,
          switchingSets: [{ id: 'sw1', type: 'video' as const, tracks: [makeResolvedVideoTrack(segments)] }],
        },
      ],
    };
  }

  it('aborts current task and loads seek destination when seek is detected', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s60', 60, 10),
      makeSegment('s70', 70, 10),
      makeSegment('s80', 80, 10),
    ];

    const { fetch, fetchedUrls, resolve } = makeControllableFetch();
    globalThis.fetch = fetch;

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentation(segments),
    });
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: makeSourceBuffer() });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    // Wait for the init fetch to start (task is in-flight)
    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/init.mp4'));

    // Seek to 60s while task is in-flight
    state.patch({ currentTime: 60 });

    // Resolve the init fetch — abort propagates and the pending task starts
    resolve('http://example.com/init.mp4');

    // Seek destination should be loaded
    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/s60.m4s'), { timeout: 3000 });

    cleanup();
  });

  it('uses only the latest pending state when multiple seeks occur during loading', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s30', 30, 10),
      makeSegment('s60', 60, 10),
      makeSegment('s90', 90, 10),
    ];

    const { fetch, fetchedUrls, resolveAll } = makeControllableFetch();
    globalThis.fetch = fetch;

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentation(segments),
    });
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: makeSourceBuffer() });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/init.mp4'));

    // Two seeks — only the latest should win
    state.patch({ currentTime: 60 });
    state.patch({ currentTime: 90 });

    resolveAll();

    // Latest seek destination should be loaded
    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/s90.m4s'), { timeout: 3000 });

    // s30 should NOT have been fetched (it was only in the aborted pre-seek window)
    expect(fetchedUrls).not.toContain('http://example.com/s30.m4s');

    cleanup();
  });

  it('does not abort during normal playback as currentTime advances slowly', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10),
    ];

    // Auto-resolving mock — no timing control needed, just verify no abort occurs
    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentation(segments),
    });
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: makeSourceBuffer() });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    // Slow advances within the same buffer window — should NOT trigger seek abort
    state.patch({ currentTime: 2 });
    state.patch({ currentTime: 4 });

    // All segments in [0, 30] window should complete normally (task was not aborted)
    await vi.waitFor(
      () => {
        expect(fetchedUrls).toContain('http://example.com/s1.m4s');
        expect(fetchedUrls).toContain('http://example.com/s2.m4s');
        expect(fetchedUrls).toContain('http://example.com/s3.m4s');
      },
      { timeout: 3000 }
    );

    cleanup();
  });
});
