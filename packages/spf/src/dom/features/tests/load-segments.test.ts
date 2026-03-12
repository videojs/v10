/**
 * Tests for segment loading orchestration (F4 + F5)
 */

import { describe, expect, it, vi } from 'vitest';
import type { Segment } from '../../../core/types';
import { createSourceBufferActor } from '../../media/source-buffer-actor';
import type { SegmentLoadingOwners, SegmentLoadingState } from '../load-segments';

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

/**
 * Creates a minimal SourceBuffer mock.
 *
 * `appendRanges` — added to `buffered` in sequence as `appendBuffer` is called
 *   (for testing the live append path).
 * `startingRanges` — present in `buffered` from the start, before any appends
 *   (for pre-seeded actor context tests where no appendBuffer calls are made).
 * `remove()` clips the current ranges to match real SourceBuffer behaviour,
 * enabling the midpoint-based segment model logic in removeTask.
 */
function makeSourceBuffer(
  appendRanges: Array<[number, number]> = [],
  startingRanges: Array<[number, number]> = []
): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};
  let appendIndex = 0;
  let ranges: Array<[number, number]> = [...startingRanges];

  const clipRanges = (start: number, end: number) => {
    const next: Array<[number, number]> = [];
    for (const [s, e] of ranges) {
      if (e <= start || s >= end) {
        next.push([s, e]);
      } else {
        if (s < start) next.push([s, start]);
        if (e > end) next.push([end, e]);
      }
    }
    ranges = next;
  };

  return {
    get buffered() {
      return {
        get length() {
          return ranges.length;
        },
        start: (i: number) => ranges[i]![0],
        end: (i: number) => ranges[i]![1],
      } as TimeRanges;
    },
    updating: false,
    appendBuffer: vi.fn(() => {
      const range = appendRanges[appendIndex++];
      if (range) ranges.push(range);
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
          listener(new Event('updateend'));
        }
      }, 0);
    }),
    remove: vi.fn((start: number, end: number) => {
      clipRanges(start, end);
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
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

/**
 * Creates a SourceBuffer + SourceBufferActor pair.
 *
 * `preloadedRanges` — initial `buffered` ranges (present before any appends).
 *   Use when the actor context is pre-seeded with segments that are already
 *   "in" the SourceBuffer without going through the append path.
 * `initialSegments` — seeds the actor context with pre-existing segments.
 */
function makeSourceBufferWithActor(
  preloadedRanges: Array<[number, number]> = [],
  initialSegments: Array<{ id: string; startTime: number; duration: number; trackId: string }> = [],
  initTrackId?: string
) {
  const sourceBuffer = makeSourceBuffer([], preloadedRanges);
  const actor = createSourceBufferActor(
    sourceBuffer,
    initialSegments.length > 0 || initTrackId !== undefined ? { initTrackId, segments: initialSegments } : undefined
  );
  return { sourceBuffer, actor };
}

// ---------------------------------------------------------------------------
// loadSegments orchestration — forward buffer behaviour
// ---------------------------------------------------------------------------

describe('loadSegments orchestration (F5)', () => {
  it('only fetches segments within the buffer window', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10),
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

    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => {
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
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 10,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    // Init already loaded for this track — actor context has initTrackId set
    const { sourceBuffer, actor } = makeSourceBufferWithActor([], [], 'track-1');
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => {
      expect(fetchedUrls).toContain('http://example.com/s1.m4s');
      expect(fetchedUrls).not.toContain('http://example.com/init.mp4');
    });

    cleanup();
  });

  it('loads additional segments when currentTime advances', async () => {
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
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 30,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    // s1 already loaded — actor pre-seeded with s1 and init
    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 10]],
      [{ id: 's1', startTime: 0, duration: 10, trackId: 'track-1' }],
      'track-1'
    );
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
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
// preload="metadata" — init segment only, no media segments
// ---------------------------------------------------------------------------

describe('loadSegments orchestration (metadata mode)', () => {
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

  it('loads init segment but not media segments for preload="metadata"', async () => {
    const segments = [makeSegment('s1', 0, 10), makeSegment('s2', 10, 10)];

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'metadata',
      selectedVideoTrackId: 'track-1',
      presentation: makePresentation(segments),
    });
    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        expect(fetchedUrls).toContain('http://example.com/init.mp4');
      },
      { timeout: 2000 }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchedUrls).not.toContain('http://example.com/s1.m4s');
    expect(fetchedUrls).not.toContain('http://example.com/s2.m4s');

    cleanup();
  });

  it('sets initTrackId in actor context after metadata init load', async () => {
    const segments = [makeSegment('s1', 0, 10)];

    globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(new ArrayBuffer(100))));

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'metadata',
      selectedVideoTrackId: 'track-1',
      presentation: makePresentation(segments),
    });
    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        expect(owners.current.videoBufferActor?.snapshot.context.initTrackId).toBe('track-1');
      },
      { timeout: 2000 }
    );

    expect(owners.current.videoBufferActor?.snapshot.context.segments.length ?? 0).toBe(0);

    cleanup();
  });

  it('loads media segments after playbackInitiated becomes true', async () => {
    const segments = [makeSegment('s1', 0, 10)];

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'metadata',
      selectedVideoTrackId: 'track-1',
      presentation: makePresentation(segments),
    });
    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        expect(owners.current.videoBufferActor?.snapshot.context.initTrackId).toBe('track-1');
      },
      { timeout: 2000 }
    );

    expect(fetchedUrls).not.toContain('http://example.com/s1.m4s');

    state.patch({ playbackInitiated: true });

    await vi.waitFor(
      () => {
        expect(fetchedUrls).toContain('http://example.com/s1.m4s');
      },
      { timeout: 2000 }
    );

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
      playbackInitiated: true, // seeks are a post-play concern; currentTime only tracked when playing
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentation(segments),
    });
    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/init.mp4'));

    state.patch({ currentTime: 60 });

    resolve('http://example.com/init.mp4');

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
      playbackInitiated: true, // seeks are a post-play concern; currentTime only tracked when playing
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentation(segments),
    });
    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/init.mp4'));

    state.patch({ currentTime: 60 });
    state.patch({ currentTime: 90 });

    resolveAll();

    await vi.waitFor(() => expect(fetchedUrls).toContain('http://example.com/s90.m4s'), { timeout: 3000 });

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
      playbackInitiated: true, // currentTime advances are only tracked post-play
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentation(segments),
    });
    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    state.patch({ currentTime: 2 });
    state.patch({ currentTime: 4 });

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

// ---------------------------------------------------------------------------
// Back buffer management (F6)
// ---------------------------------------------------------------------------

describe('loadSegments back buffer flushing', () => {
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

    const resolveAll = () => resolvers.forEach((fn) => fn());
    return { fetch, fetchedUrls, resolveAll };
  }

  function makePresentationF6(segments: Segment[]) {
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

  it('flushes back buffer before loading new segments when currentTime advances', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10),
      makeSegment('s5', 40, 10),
      makeSegment('s6', 50, 10),
    ];

    const { fetch, resolveAll } = makeControllableFetch();
    globalThis.fetch = fetch;

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    // s1–s4 already loaded, currentTime jumped to 40s
    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 40]],
      [
        { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        { id: 's2', startTime: 10, duration: 10, trackId: 'track-1' },
        { id: 's3', startTime: 20, duration: 10, trackId: 'track-1' },
        { id: 's4', startTime: 30, duration: 10, trackId: 'track-1' },
      ],
      'track-1'
    );

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 40,
      presentation: makePresentationF6(segments),
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    resolveAll();

    // With keepSegments=2: keep s3@20 and s4@30, flush [0, 20)
    await vi.waitFor(
      () => {
        expect(sourceBuffer.remove).toHaveBeenCalledWith(0, 20);
      },
      { timeout: 3000 }
    );

    cleanup();
  });

  it('does not flush when back buffer is within the keep threshold', async () => {
    const segments = [makeSegment('s1', 0, 10), makeSegment('s2', 10, 10), makeSegment('s3', 20, 10)];

    globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(new ArrayBuffer(100))));

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    // s1 already loaded, currentTime=10
    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 10]],
      [{ id: 's1', startTime: 0, duration: 10, trackId: 'track-1' }],
      'track-1'
    );

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 10,
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 30,
        selectionSets: [
          {
            id: 'ss1',
            type: 'video' as const,
            switchingSets: [{ id: 'sw1', type: 'video' as const, tracks: [makeResolvedVideoTrack(segments)] }],
          },
        ],
      },
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(() => (owners.current.videoBufferActor?.snapshot.context.segments.length ?? 0) > 1, {
      timeout: 3000,
    });

    expect(sourceBuffer.remove).not.toHaveBeenCalled();

    cleanup();
  });

  it('removes flushed segments from actor context', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10),
      makeSegment('s5', 40, 10),
    ];

    globalThis.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(new ArrayBuffer(100))));

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 40]],
      [
        { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        { id: 's2', startTime: 10, duration: 10, trackId: 'track-1' },
        { id: 's3', startTime: 20, duration: 10, trackId: 'track-1' },
        { id: 's4', startTime: 30, duration: 10, trackId: 'track-1' },
      ],
      'track-1'
    );

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 40,
      presentation: makePresentationF6(segments),
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        const ids = owners.current.videoBufferActor?.snapshot.context.segments.map((s) => s.id) ?? [];
        expect(ids).not.toContain('s1');
        expect(ids).not.toContain('s2');
      },
      { timeout: 3000 }
    );

    cleanup();
  });
});

// ---------------------------------------------------------------------------
// Forward buffer flushing
// ---------------------------------------------------------------------------

describe('loadSegments forward buffer flushing', () => {
  function makeControllableFetchFwd() {
    const resolvers = new Map<string, () => void>();
    const fetchedUrls: string[] = [];
    const fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return new Promise<Response>((resolve) => {
        resolvers.set(url, () => resolve(new Response(new ArrayBuffer(100))));
      });
    });
    const resolveAll = () => resolvers.forEach((fn) => fn());
    return { fetch, fetchedUrls, resolveAll };
  }

  function makePresentationFwd(segments: Segment[]) {
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

  it('flushes SourceBuffer content beyond the forward buffer window', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10),
      makeSegment('s5', 40, 10),
    ];

    const { fetch, resolveAll } = makeControllableFetchFwd();
    globalThis.fetch = fetch;

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    // All 5 segments pre-loaded; seeded with initial buffered range [0, 50]
    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 50]],
      segments.map((s) => ({ id: s.id, startTime: s.startTime, duration: s.duration, trackId: 'track-1' })),
      'track-1'
    );

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentationFwd(segments),
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    setTimeout(resolveAll, 10);

    // At currentTime=0, window=[0,30). s4@30 and s5@40 are beyond threshold.
    await vi.waitFor(
      () => {
        expect(sourceBuffer.remove).toHaveBeenCalledWith(30, Infinity);
      },
      { timeout: 3000 }
    );

    cleanup();
  });

  it('removes forward-flushed segments from actor context', async () => {
    const segments = [
      makeSegment('s1', 0, 10),
      makeSegment('s2', 10, 10),
      makeSegment('s3', 20, 10),
      makeSegment('s4', 30, 10),
      makeSegment('s5', 40, 10),
    ];

    const { fetch, resolveAll } = makeControllableFetchFwd();
    globalThis.fetch = fetch;

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    // Seed buffered ranges to match the pre-seeded actor context
    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 50]],
      segments.map((s) => ({ id: s.id, startTime: s.startTime, duration: s.duration, trackId: 'track-1' })),
      'track-1'
    );

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentationFwd(segments),
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    setTimeout(resolveAll, 10);

    await vi.waitFor(
      () => {
        const ids = owners.current.videoBufferActor?.snapshot.context.segments.map((s) => s.id) ?? [];
        expect(ids).not.toContain('s4');
        expect(ids).not.toContain('s5');
        expect(ids).toContain('s1');
      },
      { timeout: 3000 }
    );

    cleanup();
  });

  it('does not flush when all buffered segments are within the buffer window', async () => {
    const segments = [makeSegment('s1', 0, 10), makeSegment('s2', 10, 10), makeSegment('s3', 20, 10)];

    const { fetch, resolveAll } = makeControllableFetchFwd();
    globalThis.fetch = fetch;

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const { sourceBuffer, actor } = makeSourceBufferWithActor(
      [[0, 30]],
      segments.map((s) => ({ id: s.id, startTime: s.startTime, duration: s.duration, trackId: 'track-1' })),
      'track-1'
    );

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: makePresentationFwd(segments),
    });

    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    setTimeout(resolveAll, 10);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(sourceBuffer.remove).not.toHaveBeenCalled();

    cleanup();
  });
});

// ---------------------------------------------------------------------------
// Byte-range segment fetching (fMP4 / CMAF range-request streams)
// ---------------------------------------------------------------------------

describe('loadSegments byte-range segment fetching', () => {
  it('sends Range headers for byte-range init and media segments', async () => {
    const segments: Segment[] = [
      {
        id: 's0',
        url: 'http://example.com/video.mp4',
        startTime: 0,
        duration: 6,
        byteRange: { start: 1000, end: 2999 },
      },
      {
        id: 's1',
        url: 'http://example.com/video.mp4',
        startTime: 6,
        duration: 6,
        byteRange: { start: 3000, end: 4999 },
      },
    ];

    const rangeHeaders: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const range = (input as Request).headers?.get('Range');
      if (range) rangeHeaders.push(range);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const track = {
      type: 'video' as const,
      id: 'track-1',
      url: 'http://example.com/video.m3u8',
      mimeType: 'video/mp4',
      codecs: ['avc1.42E01E'],
      bandwidth: 1_000_000,
      initialization: { url: 'http://example.com/video.mp4', byteRange: { start: 0, end: 999 } },
      segments,
      startTime: 0,
      duration: 12,
    };

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 12,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        expect(owners.current.videoBufferActor?.snapshot.context.segments).toHaveLength(2);
      },
      { timeout: 3000 }
    );

    expect(rangeHeaders).toContain('bytes=0-999'); // init segment
    expect(rangeHeaders).toContain('bytes=1000-2999'); // s0
    expect(rangeHeaders).toContain('bytes=3000-4999'); // s1

    cleanup();
  });

  it('does not send Range header for non-byte-range segments', async () => {
    const segments = [makeSegment('s0', 0, 10)];

    const rangeHeaders: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const range = (input as Request).headers?.get('Range');
      if (range) rangeHeaders.push(range);
      return Promise.resolve(new Response(new ArrayBuffer(100)));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
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
    });

    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        expect(owners.current.videoBufferActor?.snapshot.context.segments).toHaveLength(1);
      },
      { timeout: 3000 }
    );

    expect(rangeHeaders).toHaveLength(0);

    cleanup();
  });
});

// ---------------------------------------------------------------------------
// Streaming bandwidth tracking
// ---------------------------------------------------------------------------

describe('loadSegments bandwidth tracking', () => {
  function makeStreamingFetch(chunks: Uint8Array[]) {
    return vi.fn().mockImplementation(() => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      });
      return Promise.resolve(new Response(body));
    });
  }

  it('samples bandwidth per chunk and updates state.bandwidthState', async () => {
    const chunkSize = 50_000; // 50 KB — below 128 KB default, so whole segment = one flush
    const numChunks = 3;
    const chunks = Array.from({ length: numChunks }, () => new Uint8Array(chunkSize).fill(1));

    globalThis.fetch = makeStreamingFetch(chunks);

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const segment = { id: 's1', url: 'http://example.com/s1.m4s', startTime: 0, duration: 10 };
    const track = {
      type: 'video' as const,
      id: 'track-1',
      url: 'http://example.com/video.m3u8',
      mimeType: 'video/mp4',
      codecs: ['avc1.42E01E'],
      bandwidth: 1_000_000,
      initialization: { url: 'http://example.com/init.mp4' },
      segments: [segment],
      startTime: 0,
      duration: 10,
    };

    // Seeding bandwidthState activates the onSample bridge → state.bandwidthState updates
    const initialBandwidth = {
      fastEstimate: 0,
      fastTotalWeight: 0,
      slowEstimate: 0,
      slowTotalWeight: 0,
      bytesSampled: 0,
    };

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      bandwidthState: initialBandwidth,
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 10,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    // Wait for both init and segment to be appended (actor context will have 1 segment)
    await vi.waitFor(
      () => {
        expect(owners.current.videoBufferActor?.snapshot.context.segments).toHaveLength(1);
      },
      { timeout: 3000 }
    );

    // All bytes (init + segment) should be counted in bytesSampled
    const totalExpected = chunkSize * numChunks * 2; // init fetch + segment fetch, each 3×50KB
    expect(state.current.bandwidthState?.bytesSampled).toBeGreaterThan(0);
    expect(state.current.bandwidthState?.bytesSampled).toBeLessThanOrEqual(totalExpected);

    cleanup();
  });

  it('appended data matches the concatenated streaming chunks', async () => {
    const part1 = new Uint8Array([1, 2, 3, 4]);
    const part2 = new Uint8Array([5, 6, 7, 8]);

    globalThis.fetch = vi.fn().mockImplementation(() => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(part1);
          controller.enqueue(part2);
          controller.close();
        },
      });
      return Promise.resolve(new Response(body));
    });

    const { loadSegments } = await import('../load-segments');
    const { createState: cs } = await import('../../../core/state/create-state');

    const segment = { id: 's1', url: 'http://example.com/s1.m4s', startTime: 0, duration: 10 };
    const track = {
      type: 'video' as const,
      id: 'track-1',
      url: 'http://example.com/video.m3u8',
      mimeType: 'video/mp4',
      codecs: ['avc1.42E01E'],
      bandwidth: 500_000,
      initialization: { url: 'http://example.com/init.mp4' },
      segments: [segment],
      startTime: 0,
      duration: 10,
    };

    const state = cs<SegmentLoadingState>({
      preload: 'auto',
      selectedVideoTrackId: 'track-1',
      currentTime: 0,
      presentation: {
        id: 'p1',
        url: 'http://example.com/playlist.m3u8',
        startTime: 0,
        duration: 10,
        selectionSets: [{ id: 'ss1', type: 'video', switchingSets: [{ id: 'sw1', type: 'video', tracks: [track] }] }],
      },
    });

    const { sourceBuffer, actor } = makeSourceBufferWithActor();
    const owners = cs<SegmentLoadingOwners>({ videoBuffer: sourceBuffer, videoBufferActor: actor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await vi.waitFor(
      () => {
        expect(owners.current.videoBufferActor?.snapshot.context.segments).toHaveLength(1);
      },
      { timeout: 3000 }
    );

    // Each response body yields [1,2,3,4,5,6,7,8] — both init and segment appends should match
    const calls = (sourceBuffer.appendBuffer as ReturnType<typeof vi.fn>).mock.calls;
    for (const [data] of calls) {
      expect(Array.from(new Uint8Array(data as ArrayBuffer))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }

    cleanup();
  });
});
