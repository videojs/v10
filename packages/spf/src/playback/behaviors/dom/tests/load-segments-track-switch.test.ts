import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { BandwidthState } from '../../../../media/abr/bandwidth-estimator';
import type { MaybeResolvedPresentation, Presentation, VideoSelectionSet } from '../../../../media/types';
import { createSourceBufferActor, type SourceBufferActor } from '../../../actors/dom/source-buffer';
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
    bandwidthState: signal<BandwidthState | undefined>(initial.bandwidthState),
    currentTime: signal<number | undefined>(initial.currentTime),
    playbackInitiated: signal<boolean | undefined>(initial.playbackInitiated),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
  };
}

function makeContext(initial: SegmentLoadingContext = {}): ContextSignals<SegmentLoadingContext> {
  return {
    videoBuffer: signal<SourceBuffer | undefined>(initial.videoBuffer),
    audioBuffer: signal<SourceBuffer | undefined>(initial.audioBuffer),
    videoBufferActor: signal<SourceBufferActor | undefined>(initial.videoBufferActor),
    audioBufferActor: signal<SourceBufferActor | undefined>(initial.audioBufferActor),
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

  it('does not flush SourceBuffer on track switch; new content overwrites old via deduplication', async () => {
    const { flushBuffer } = await import('../../../../media/dom/mse/buffer-flusher');
    const flushSpy = vi.mocked(flushBuffer);

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0), seg('a2', 10)]);
    const trackB = makeResolvedVideoTrack('track-b', [seg('b1', 0), seg('b2', 10)]);
    const presentation = makePresentation(trackA, trackB);

    const videoBuffer = makeMockSourceBuffer();

    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'track-a',
      segments: [
        { id: 'a1', startTime: 0, duration: 10, trackId: 'track-a' },
        { id: 'a2', startTime: 10, duration: 10, trackId: 'track-a' },
      ],
    });

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      playbackInitiated: true,
      currentTime: 5,
    });

    const context = makeContext({ videoBuffer, videoBufferActor });

    const cleanup = loadVideoSegments.setup({ state, context });

    await new Promise((r) => setTimeout(r, 20));

    state.selectedVideoTrackId.set('track-b');

    await new Promise((r) => setTimeout(r, 50));

    expect(flushSpy).not.toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    const ctx = context.videoBufferActor.get()?.snapshot.get().context;
    expect(ctx?.initTrackId).toBe('track-b');

    const hasOldSegments = ctx?.segments.some((s) => ['a1', 'a2'].includes(s.id));
    expect(hasOldSegments).toBeFalsy();

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

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      playbackInitiated: true,
      currentTime: 0,
    });

    const context = makeContext({ videoBuffer, videoBufferActor });
    const cleanup = loadVideoSegments.setup({ state, context });

    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/track-a-init.mp4'));

    state.selectedVideoTrackId.set('track-b');

    resolve('https://example.com/track-a-init.mp4');

    await vi.waitFor(() => expect(fetchedUrls).toContain('https://example.com/track-b-init.mp4'), {
      timeout: 3000,
    });

    resolve('https://example.com/track-b-init.mp4');

    await vi.waitFor(() => expect(context.videoBufferActor.get()?.snapshot.get().context.initTrackId).toBe('track-b'), {
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

    const videoBufferActor = createSourceBufferActor(videoBuffer, {
      initTrackId: 'track-a',
      segments: [
        { id: 'a1', startTime: 0, duration: 10, trackId: 'track-a' },
        { id: 'a2', startTime: 10, duration: 10, trackId: 'track-a' },
      ],
    });

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      playbackInitiated: true,
      currentTime: 25,
    });

    const context = makeContext({ videoBuffer, videoBufferActor });
    const cleanup = loadVideoSegments.setup({ state, context });

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

    cleanup();
  });

  it('does NOT flush on first init load (no prior track)', async () => {
    const { flushBuffer } = await import('../../../../media/dom/mse/buffer-flusher');
    const flushSpy = vi.mocked(flushBuffer);

    const trackA = makeResolvedVideoTrack('track-a', [seg('a1', 0)]);
    const presentation = makePresentation(trackA);
    const videoBuffer = makeMockSourceBuffer();

    const videoBufferActor = createSourceBufferActor(videoBuffer);

    const state = makeState({
      presentation,
      selectedVideoTrackId: 'track-a',
      preload: 'auto',
      currentTime: 0,
    });

    const context = makeContext({ videoBuffer, videoBufferActor });

    const cleanup = loadVideoSegments.setup({ state, context });
    await new Promise((r) => setTimeout(r, 50));

    expect(flushSpy).not.toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    cleanup();
  });
});
