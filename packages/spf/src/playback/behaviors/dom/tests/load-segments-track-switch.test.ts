import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation, VideoSelectionSet } from '../../../../media/types';
import { fetchStream } from '../../../../network/fetch';
import { createSegmentLoaderActor, type SegmentLoaderActor } from '../../../actors/dom/segment-loader';
import { createSourceBufferActor, type SourceBufferActor } from '../../../actors/dom/source-buffer';
import type { TextTrackSegmentLoaderActor } from '../../../actors/text-track-segment-loader';
import type { SegmentLoadingContext, SegmentLoadingState } from '../load-segments';
import { loadVideoSegments } from '../load-segments';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../../../../media/dom/mse/append-segment', () => ({
  appendSegment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../media/dom/mse/buffer-flusher', () => ({
  flushBuffer: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Helpers
// ============================================================================

function makeState(initial: SegmentLoadingState = {}): StateSignals<SegmentLoadingState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    preload: signal<string | undefined>(initial.preload),
    currentTime: signal<number | undefined>(initial.currentTime),
    loadActivated: signal<boolean | undefined>(initial.loadActivated),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
  };
}

function makeContext(
  initial: {
    videoBufferActor?: SourceBufferActor;
    audioBufferActor?: SourceBufferActor;
    videoSegmentLoaderActor?: SegmentLoaderActor;
    audioSegmentLoaderActor?: SegmentLoaderActor;
    textTrackSegmentLoaderActor?: TextTrackSegmentLoaderActor;
  } = {}
): ContextSignals<SegmentLoadingContext> & {
  videoBufferActor: ReturnType<typeof signal<SourceBufferActor | undefined>>;
  audioBufferActor: ReturnType<typeof signal<SourceBufferActor | undefined>>;
} {
  return {
    videoBufferActor: signal<SourceBufferActor | undefined>(initial.videoBufferActor),
    audioBufferActor: signal<SourceBufferActor | undefined>(initial.audioBufferActor),
    videoSegmentLoaderActor: signal<SegmentLoaderActor | undefined>(initial.videoSegmentLoaderActor),
    audioSegmentLoaderActor: signal<SegmentLoaderActor | undefined>(initial.audioSegmentLoaderActor),
    textTrackSegmentLoaderActor: signal<TextTrackSegmentLoaderActor | undefined>(initial.textTrackSegmentLoaderActor),
  };
}

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
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 })));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('does not flush or refetch already-buffered aligned positions on ABR switch', async () => {
    const { flushBuffer } = await import('../../../../media/dom/mse/buffer-flusher');
    const flushSpy = vi.mocked(flushBuffer);

    // Real renditions number segments positionally per playlist (`segment-N`), so
    // an ABR pair shares ids on an aligned grid. Switching quality when the forward
    // buffer is already full at those positions should NOT re-download them (the
    // content is identical; only the encode quality differs) — and must never flush.
    const trackA = makeResolvedVideoTrack('track-a', [seg('segment-0', 0), seg('segment-1', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', [seg('segment-0', 0), seg('segment-1', 10)]);
    const presentation = makePresentation(trackA, trackB);

    const videoBuffer = makeMockSourceBuffer();

    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'track-a',
      segments: [
        { id: 'segment-0', startTime: 0, duration: 10, trackId: 'track-a' },
        { id: 'segment-1', startTime: 10, duration: 10, trackId: 'track-a' },
      ],
    });
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 }));
    });

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      loadActivated: true,
      currentTime: 5,
    });

    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });

    const reactor = loadVideoSegments.setup({ state, context });

    await new Promise((r) => setTimeout(r, 20));
    fetchedUrls.length = 0;

    state.selectedVideoTrackId.set('track-b');

    await new Promise((r) => setTimeout(r, 50));

    // Never a full flush on an ABR switch.
    expect(flushSpy).not.toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    const ctx = videoBufferActor.snapshot.get().context;
    // Init switches to the new rendition...
    expect(ctx?.initTrackId).toBe('track-b');
    expect(fetchedUrls).toContain('https://example.com/track-b-init.mp4');
    // ...but the already-buffered, time-aligned positions are retained, not refetched.
    expect(fetchedUrls.some((u) => u.endsWith('.m4s'))).toBe(false);
    expect(ctx?.segments.map((s) => s.startTime).sort((a, b) => a - b)).toEqual([0, 10]);

    reactor.destroy();
    videoLoader.destroy();
  });

  it('loads the bridging segment when switching to a misaligned rendition (no gap)', async () => {
    // Cross-rendition grid misalignment: a 30fps rung cuts its first GOP at 7.13333s,
    // a 60fps rung at 7.98333s, so their `segment-1`s span different time ranges while
    // sharing the positional id. Buffer holds LOW's segment-0/1 (covers 0..15.13333);
    // switching to HIGH must fetch HIGH's segment-1 (7.98333..15.98333) to cover the
    // 15.13333..15.98333 tail — matching by id alone would skip it and leave a gap.
    const posSeg = (trackId: string, index: number, startTime: number, duration: number) => ({
      id: `segment-${index}`,
      url: `https://example.com/${trackId}/segment-${index}.m4s`,
      startTime,
      duration,
    });
    const low = {
      ...makeResolvedVideoTrack('low', []),
      segments: [posSeg('low', 0, 0, 7.13333), posSeg('low', 1, 7.13333, 8)],
    };
    const high = {
      ...makeResolvedVideoTrack('high', []),
      segments: [posSeg('high', 0, 0, 7.98333), posSeg('high', 1, 7.98333, 8), posSeg('high', 2, 15.98333, 8)],
    };
    const presentation = makePresentation(low, high);

    const videoBuffer = makeMockSourceBuffer();
    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'low',
      segments: [
        { id: 'segment-0', startTime: 0, duration: 7.13333, trackId: 'low' },
        { id: 'segment-1', startTime: 7.13333, duration: 8, trackId: 'low' },
      ],
    });
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 }));
    });

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'low',
      preload: 'auto',
      loadActivated: true,
      currentTime: 5,
    });
    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });
    const reactor = loadVideoSegments.setup({ state, context });

    await new Promise((r) => setTimeout(r, 20));
    fetchedUrls.length = 0;

    state.selectedVideoTrackId.set('high');

    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/high/segment-1.m4s'), { timeout: 3000 });
    // The tail segment loads too; the fully-covered leading segment-0 is not refetched.
    expect(fetchedUrls).toContain('https://example.com/high/segment-2.m4s');
    expect(fetchedUrls).not.toContain('https://example.com/high/segment-0.m4s');

    reactor.destroy();
    videoLoader.destroy();
  });

  it('loads the leading bridge segment on a shallow-buffer misaligned switch (no gap)', async () => {
    // Regression for a Firefox stall: ABR upshifts to a misaligned rung while
    // only the LOW rung's segment-0 ([0, 7.13333]) is buffered. HIGH's
    // segment-0 spans [0, 7.98333]; its [7.13333, 7.98333] tail is the gap.
    // Because it reuses the positional id `segment-0`, an id match would treat
    // it as already buffered and skip it, leaving the tail as a SourceBuffer
    // gap that Firefox won't jump. Time-coverage must see it uncovered and
    // fetch the leading segment — distinct from the deep-buffer case above,
    // where segment-0 is legitimately covered and correctly NOT refetched.
    const posSeg = (trackId: string, index: number, startTime: number, duration: number) => ({
      id: `segment-${index}`,
      url: `https://example.com/${trackId}/segment-${index}.m4s`,
      startTime,
      duration,
    });
    // LOW has only segment-0 so the warmup can't deepen the buffer past it —
    // the switch fires while ONLY [0, 7.13333] is buffered (the observed
    // Firefox state: LOW segment-0, no LOW segment-1).
    const low = {
      ...makeResolvedVideoTrack('low', []),
      segments: [posSeg('low', 0, 0, 7.13333)],
    };
    const high = {
      ...makeResolvedVideoTrack('high', []),
      segments: [posSeg('high', 0, 0, 7.98333), posSeg('high', 1, 7.98333, 8), posSeg('high', 2, 15.98333, 8)],
    };
    const presentation = makePresentation(low, high);

    const videoBuffer = makeMockSourceBuffer();
    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'low',
      // Shallow: only the first LOW segment is buffered when the switch fires.
      segments: [{ id: 'segment-0', startTime: 0, duration: 7.13333, trackId: 'low' }],
    });
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 }));
    });

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'low',
      preload: 'auto',
      loadActivated: true,
      currentTime: 5,
    });
    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });
    const reactor = loadVideoSegments.setup({ state, context });

    await new Promise((r) => setTimeout(r, 20));
    fetchedUrls.length = 0;

    state.selectedVideoTrackId.set('high');

    // The leading bridge segment MUST load — its [7.13333, 7.98333] tail is the gap.
    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/high/segment-0.m4s'), { timeout: 3000 });

    reactor.destroy();
    videoLoader.destroy();
  });

  it('loads HIGH bridge when the switch preempts an in-flight same-id LOW segment (misaligned)', async () => {
    // Root cause of the intermittent Firefox stall. Renditions share positional
    // ids (`segment-0`). If ABR switches LOW->HIGH while LOW's segment-0 is still
    // IN-FLIGHT (not yet appended), `inFlightStillNeeded` matches HIGH's needed
    // segment-0 against the in-flight LOW segment-0 BY ID, keeps the LOW fetch,
    // and skips scheduling HIGH's segment-0. LOW seg-0 ([0, 7.13333]) then
    // appends and HIGH seg-1+ ([7.98333, ...]) append, leaving the
    // [7.13333, 7.98333] gap. Intermittent because it only triggers when the
    // switch beats LOW segment-0's append.
    const posSeg = (trackId: string, index: number, startTime: number, duration: number) => ({
      id: `segment-${index}`,
      url: `https://example.com/${trackId}/segment-${index}.m4s`,
      startTime,
      duration,
    });
    const low = {
      ...makeResolvedVideoTrack('low', []),
      bandwidth: 582820,
      segments: [posSeg('low', 0, 0, 7.13333), posSeg('low', 1, 7.13333, 8)],
    };
    const high = {
      ...makeResolvedVideoTrack('high', []),
      bandwidth: 9873268,
      segments: [posSeg('high', 0, 0, 7.98333), posSeg('high', 1, 7.98333, 8), posSeg('high', 2, 15.98333, 8)],
    };
    const presentation = makePresentation(low, high);

    const videoBuffer = makeMockSourceBuffer();
    // initTrackId 'low' committed, nothing appended yet — LOW segment-0 will be
    // the first in-flight fetch.
    const videoBufferActor = createSourceBufferActor(videoBuffer, { initTrackId: 'low', segments: [] });
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const { fetch, fetchedUrls, resolveAll } = makeControllableFetch();
    globalThis.fetch = fetch;

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'low',
      preload: 'auto',
      loadActivated: true,
      currentTime: 0,
    });
    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });
    const reactor = loadVideoSegments.setup({ state, context });

    // LOW segment-0 goes in-flight (fetch hangs, unresolved).
    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/low/segment-0.m4s'), { timeout: 3000 });

    // Switch while LOW segment-0 is still in-flight (not appended).
    state.selectedVideoTrackId.set('high');
    await new Promise((r) => setTimeout(r, 30));

    // Drain: resolve in-flight + newly-scheduled fetches until settled.
    for (let i = 0; i < 5; i++) {
      resolveAll();
      await new Promise((r) => setTimeout(r, 20));
    }

    // The HIGH bridge segment-0 MUST be fetched — its [7.13333, 7.98333] tail
    // is the gap. On the buggy code it is skipped (id collision with the
    // in-flight LOW segment-0).
    expect(fetchedUrls).toContain('https://example.com/high/segment-0.m4s');

    reactor.destroy();
    videoLoader.destroy();
  });

  it('preempts in-flight fetch when track switches; loads new track init', async () => {
    const { fetch: controllableFetch, fetchedUrls, resolve } = makeControllableFetch();
    globalThis.fetch = controllableFetch;

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0), seg('a2', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', [seg('b1', 0), seg('b2', 10)]);
    const presentation = makePresentation(trackA, trackB);
    const videoBuffer = makeMockSourceBuffer();
    const videoBufferActor = createSourceBufferActor(videoBuffer);
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      loadActivated: true,
      currentTime: 0,
    });

    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });
    const reactor = loadVideoSegments.setup({ state, context });

    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/track-a-init.mp4'));

    state.selectedVideoTrackId.set('track-b');

    resolve('https://example.com/track-a-init.mp4');

    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/track-b-init.mp4'), {
      timeout: 3000,
    });

    resolve('https://example.com/track-b-init.mp4');

    await vi.waitFor(() => expect(videoBufferActor.snapshot.get().context.initTrackId).toBe('track-b'), {
      timeout: 3000,
    });

    reactor.destroy();
    videoLoader.destroy();
  });

  it('loads segments at currentTime position when track switches mid-playback', async () => {
    const segments = [seg('b1', 0), seg('b2', 10), seg('b3', 20), seg('b4', 30), seg('b5', 40), seg('b6', 50)];
    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0), seg('a2', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', segments);
    const presentation = makePresentation(trackA, trackB);
    const videoBuffer = makeMockSourceBuffer();

    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'track-a',
      segments: [
        { id: 'a1', startTime: 0, duration: 10, trackId: 'track-a' },
        { id: 'a2', startTime: 10, duration: 10, trackId: 'track-a' },
      ],
    });
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      loadActivated: true,
      currentTime: 25,
    });

    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });
    const reactor = loadVideoSegments.setup({ state, context });

    await new Promise((r) => setTimeout(r, 20));

    state.selectedVideoTrackId.set('track-b');

    const fetchedUrls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      fetchedUrls.push(url);
      return Promise.resolve(new Response(new ArrayBuffer(100), { status: 200 }));
    });

    await vi.waitFor(
      () => {
        expect(fetchedUrls).toContain('https://example.com/b3.m4s');
        expect(fetchedUrls).toContain('https://example.com/b4.m4s');
      },
      { timeout: 3000 }
    );

    expect(fetchedUrls).not.toContain('https://example.com/b1.m4s');
    expect(fetchedUrls).not.toContain('https://example.com/b2.m4s');

    reactor.destroy();
    videoLoader.destroy();
  });

  it('does NOT flush on first init load (no prior track)', async () => {
    const { flushBuffer } = await import('../../../../media/dom/mse/buffer-flusher');
    const flushSpy = vi.mocked(flushBuffer);

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0)]);
    const presentation = makePresentation(trackA);
    const videoBuffer = makeMockSourceBuffer();

    const videoBufferActor = createSourceBufferActor(videoBuffer);
    const videoLoader = createSegmentLoaderActor(videoBufferActor, fetchStream);

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      currentTime: 0,
    });

    const context = makeContext({ videoBufferActor, videoSegmentLoaderActor: videoLoader });

    const reactor = loadVideoSegments.setup({ state, context });
    await new Promise((r) => setTimeout(r, 50));

    expect(flushSpy).not.toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    reactor.destroy();
    videoLoader.destroy();
  });
});
