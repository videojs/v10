import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../core/state/create-state';
import type { Presentation, VideoSelectionSet } from '../../core/types';
import type { SegmentLoadingOwners, SegmentLoadingState } from '../features/load-segments';
import { loadSegments } from '../features/load-segments';
import { createSourceBufferActor } from '../media/source-buffer-actor';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../media/append-segment', () => ({
  appendSegment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../media/buffer-flusher', () => ({
  flushBuffer: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Helpers
// ============================================================================

const seg = (id: string, startTime: number, duration = 10) => ({
  id,
  url: `https://example.com/${id}.m4s`,
  startTime,
  duration,
});

const makeResolvedVideoTrack = (id: string, segments: ReturnType<typeof seg>[]) => ({
  type: 'video' as const,
  id,
  url: `https://example.com/${id}.m3u8`,
  bandwidth: 2_000_000,
  mimeType: 'video/mp4',
  codecs: ['avc1.42E01E'],
  width: 1280,
  height: 720,
  startTime: 0,
  duration: segments.reduce((sum, s) => sum + s.duration, 0),
  initialization: { url: `https://example.com/${id}-init.mp4` },
  segments,
});

const makePresentation = (...tracks: ReturnType<typeof makeResolvedVideoTrack>[]): Presentation =>
  ({
    id: 'pres',
    url: 'https://example.com/playlist.m3u8',
    selectionSets: [
      {
        id: 'vs',
        type: 'video' as const,
        switchingSets: [{ id: 'sw', type: 'video' as const, tracks }],
      } as VideoSelectionSet,
    ],
    startTime: 0,
  }) as Presentation;

const makeMockSourceBuffer = () => {
  const sb = {
    updating: false,
    buffered: { length: 0, start: vi.fn(), end: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendBuffer: vi.fn(),
    remove: vi.fn(),
  } as unknown as SourceBuffer;
  return sb;
};

// ============================================================================
// Helpers
// ============================================================================

function makeControllableFetch() {
  const resolvers = new Map<string, () => void>();
  const fetchedUrls: string[] = [];

  const fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    fetchedUrls.push(url);
    return new Promise<Response>((resolve) => {
      resolvers.set(url, () => resolve(new Response(new ArrayBuffer(100), { status: 200 })));
    });
  });

  const resolve = (url: string) => resolvers.get(url)?.();
  const resolveAll = () => resolvers.forEach((fn) => fn());

  return { fetch, fetchedUrls, resolve, resolveAll };
}

// ============================================================================
// Track switch — Bug 3
// ============================================================================

describe('loadSegments — track switch', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Use mockImplementation so each call gets a fresh Response (avoiding
    // "body stream already read" errors when multiple fetches occur).
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 })));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('does not flush SourceBuffer on track switch; new content overwrites old via deduplication', async () => {
    const { flushBuffer } = await import('../media/buffer-flusher');
    const flushSpy = vi.mocked(flushBuffer);

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0), seg('a2', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', [seg('b1', 0), seg('b2', 10)]);
    const presentation = makePresentation(trackA, trackB);

    const videoBuffer = makeMockSourceBuffer();

    // Pre-seed actor with track-a already loaded
    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'track-a',
      segments: [
        { id: 'a1', startTime: 0, duration: 10, trackId: 'track-a' },
        { id: 'a2', startTime: 10, duration: 10, trackId: 'track-a' },
      ],
    });

    const state = createState<SegmentLoadingState>({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      playbackInitiated: true, // track switches are an ABR concern during playback
      currentTime: 5,
    });

    const owners = createState<SegmentLoadingOwners>({ videoBuffer, videoBufferActor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    // Wait for initial evaluation to settle (track-a already fully loaded — no work needed)
    await new Promise((r) => setTimeout(r, 20));

    // ABR switches to track B
    state.patch({ selectedVideoTrackId: 'track-b' });

    // Wait for task to process track switch
    await new Promise((r) => setTimeout(r, 50));

    // No full flush: new content overwrites existing buffer ranges in-place.
    expect(flushSpy).not.toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    // New track-b init should be committed.
    const ctx = owners.current.videoBufferActor?.snapshot.context;
    expect(ctx?.initTrackId).toBe('track-b');

    // Old track-a segments should be gone: time-aligned deduplication replaces
    // each a* entry when b* is appended at the same startTime.
    const hasOldSegments = ctx?.segments.some((s) => ['a1', 'a2'].includes(s.id));
    expect(hasOldSegments).toBeFalsy();

    // New track-b segments should be present.
    const hasNewSegments = ctx?.segments.some((s) => ['b1', 'b2'].includes(s.id));
    expect(hasNewSegments).toBeTruthy();

    cleanup();
  });

  it('preempts in-flight fetch when track switches; loads new track init', async () => {
    const { fetch: controllableFetch, fetchedUrls, resolve } = makeControllableFetch();
    globalThis.fetch = controllableFetch;

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0), seg('a2', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', [seg('b1', 0), seg('b2', 10)]);
    const presentation = makePresentation(trackA, trackB);
    const videoBuffer = makeMockSourceBuffer();
    const videoBufferActor = createSourceBufferActor(videoBuffer);

    const state = createState<SegmentLoadingState>({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      playbackInitiated: true,
      currentTime: 0,
    });

    const owners = createState<SegmentLoadingOwners>({ videoBuffer, videoBufferActor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    // Wait for track-a init fetch to start (but leave it pending)
    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/track-a-init.mp4'));

    // Switch tracks while track-a init is still in-flight
    state.patch({ selectedVideoTrackId: 'track-b' });

    // Unblock the pending init fetch so the runner can progress
    resolve('https://example.com/track-a-init.mp4');

    // track-b init should be fetched after the preempt
    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/track-b-init.mp4'), {
      timeout: 3000,
    });

    resolve('https://example.com/track-b-init.mp4');

    await vi.waitFor(() => expect(owners.current.videoBufferActor?.snapshot.context.initTrackId).toBe('track-b'), {
      timeout: 3000,
    });

    cleanup();
  });

  it('loads segments at currentTime position when track switches mid-playback', async () => {
    const segments = [seg('b1', 0), seg('b2', 10), seg('b3', 20), seg('b4', 30), seg('b5', 40), seg('b6', 50)];
    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0), seg('a2', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', segments);
    const presentation = makePresentation(trackA, trackB);
    const videoBuffer = makeMockSourceBuffer();

    // Pre-seed actor: track-a fully loaded, playing at t=25
    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'track-a',
      segments: [
        { id: 'a1', startTime: 0, duration: 10, trackId: 'track-a' },
        { id: 'a2', startTime: 10, duration: 10, trackId: 'track-a' },
      ],
    });

    const state = createState<SegmentLoadingState>({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      playbackInitiated: true,
      currentTime: 25,
    });

    const owners = createState<SegmentLoadingOwners>({ videoBuffer, videoBufferActor });
    const cleanup = loadSegments({ state, owners }, { type: 'video' });

    await new Promise((r) => setTimeout(r, 20));

    // Switch to track-b at currentTime=25
    state.patch({ selectedVideoTrackId: 'track-b' });

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 }));
    });

    // Segments at or past currentTime=25 should be loaded (b3@20 overlaps [25,55), b4-b6)
    await vi.waitFor(
      () => {
        expect(fetchedUrls).toContain('https://example.com/b3.m4s');
        expect(fetchedUrls).toContain('https://example.com/b4.m4s');
      },
      { timeout: 3000 }
    );

    // Segments before currentTime=25 should NOT be loaded (b1@0 and b2@10 end before 25)
    expect(fetchedUrls).not.toContain('https://example.com/b1.m4s');
    expect(fetchedUrls).not.toContain('https://example.com/b2.m4s');

    cleanup();
  });

  it('does NOT flush on first init load (no prior track)', async () => {
    const { flushBuffer } = await import('../media/buffer-flusher');
    const flushSpy = vi.mocked(flushBuffer);

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0)]);
    const presentation = makePresentation(trackA);
    const videoBuffer = makeMockSourceBuffer();

    // Actor starts fresh (no prior track)
    const videoBufferActor = createSourceBufferActor(videoBuffer);

    const state = createState<SegmentLoadingState>({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      currentTime: 0,
    });

    const owners = createState<SegmentLoadingOwners>({ videoBuffer, videoBufferActor });

    const cleanup = loadSegments({ state, owners }, { type: 'video' });
    await new Promise((r) => setTimeout(r, 50));

    // No full flush should happen on first init load
    expect(flushSpy).not.toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    cleanup();
  });
});
