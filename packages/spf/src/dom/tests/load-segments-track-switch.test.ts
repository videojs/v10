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

  it('flushes entire SourceBuffer and resets bufferState when track switches', async () => {
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

    // flushBuffer(0, Infinity) should have been called to clear old track content
    expect(flushSpy).toHaveBeenCalledWith(videoBuffer, 0, Infinity);

    // After the full flush, the old track's data should be gone.
    const ctx = owners.current.videoBufferActor?.snapshot.context;
    expect(ctx?.initTrackId).not.toBe('track-a');
    const hasOldSegments = ctx?.segments.some((s) => ['a1', 'a2'].includes(s.id));
    expect(hasOldSegments).toBeFalsy();

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
