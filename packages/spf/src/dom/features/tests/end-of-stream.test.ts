import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation, Segment, VideoTrack } from '../../../core/types';
import { createSourceBufferActor, type SourceBufferActor } from '../../media/source-buffer-actor';
import {
  canEndStream,
  type EndOfStreamOwners,
  type EndOfStreamState,
  endOfStream,
  hasLastSegmentLoaded,
  shouldEndStream,
} from '../end-of-stream';

// ============================================================================
// Mock helpers
// ============================================================================

function makeMediaSource(overrides: { readyState?: string; duration?: number } = {}): MediaSource {
  const ms = Object.create(MediaSource.prototype, {
    readyState: { value: overrides.readyState ?? 'open', writable: true },
    duration: { value: overrides.duration ?? 0, writable: true },
  }) as MediaSource;
  ms.endOfStream = vi.fn();
  return ms;
}

function makeSourceBuffer(): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};
  return {
    buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
    updating: false,
    appendBuffer: vi.fn(() => {
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) listener(new Event('updateend'));
      }, 0);
    }),
    remove: vi.fn(() => {
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) listener(new Event('updateend'));
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

function makeSegments(count: number): Segment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `seg-${i}`,
    url: `https://example.com/seg-${i}.m4s`,
    startTime: i * 2.5,
    duration: 2.5,
  }));
}

function makeResolvedVideoTrack(segmentCount: number, id = 'video-1'): VideoTrack {
  return {
    id,
    type: 'video' as const,
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    bandwidth: 1_000_000,
    initialization: { id: 'init', url: 'https://example.com/init.mp4' },
    segments: makeSegments(segmentCount),
    startTime: 0,
    duration: segmentCount * 2.5,
    codecs: 'avc1.64001f',
  } as unknown as VideoTrack;
}

function makePresentation(videoTrack: VideoTrack, id = 'pres-1'): Presentation {
  return {
    id,
    url: 'https://example.com/playlist.m3u8',
    selectionSets: [{ type: 'video', switchingSets: [{ tracks: [videoTrack] }] }],
  } as unknown as Presentation;
}

/**
 * Create a SourceBufferActor pre-seeded with the given segment IDs.
 * Uses a fresh SourceBuffer mock; segments get timing derived from their index.
 */
function makeActorWithSegments(segmentIds: string[], trackId = 'video-1'): SourceBufferActor {
  return createSourceBufferActor(makeSourceBuffer(), {
    initTrackId: trackId,
    segments: segmentIds.map((id, i) => ({
      id,
      startTime: i * 2.5,
      duration: 2.5,
      trackId,
    })),
  });
}

// ============================================================================
// canEndStream
// ============================================================================

describe('canEndStream', () => {
  it('returns false when mediaSource is missing', () => {
    const state: EndOfStreamState = { presentation: { id: 'p', url: 'x' } as Presentation };
    expect(canEndStream(state, {})).toBe(false);
  });

  it('returns false when presentation is missing', () => {
    expect(canEndStream({}, { mediaSource: makeMediaSource() })).toBe(false);
  });

  it('returns true when both present', () => {
    const state: EndOfStreamState = { presentation: { id: 'p', url: 'x' } as Presentation };
    expect(canEndStream(state, { mediaSource: makeMediaSource() })).toBe(true);
  });
});

// ============================================================================
// hasLastSegmentLoaded
// ============================================================================

describe('hasLastSegmentLoaded', () => {
  it('returns true when no tracks are selected', () => {
    expect(hasLastSegmentLoaded({ presentation: { id: 'p', url: 'x' } as Presentation }, {})).toBe(true);
  });

  it('returns false when last segment ID is not in actor context', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    // seg-3 (the last segment) is missing
    const owners: EndOfStreamOwners = {
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2']),
    };
    expect(hasLastSegmentLoaded(state, owners)).toBe(false);
  });

  it('returns true when last segment ID is present (seek-back scenario)', () => {
    const track = makeResolvedVideoTrack(10);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    // Last segment is in the SourceBuffer from a prior play-through.
    const owners: EndOfStreamOwners = {
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-7', 'seg-8', 'seg-9']),
    };
    expect(hasLastSegmentLoaded(state, owners)).toBe(true);
  });

  it('returns true when last segment ID is in actor context', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    const owners: EndOfStreamOwners = {
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    };
    expect(hasLastSegmentLoaded(state, owners)).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    const track = makeResolvedVideoTrack(10);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    // Early segments flushed, last segment still present
    const owners: EndOfStreamOwners = {
      videoBufferActor: makeActorWithSegments(['seg-7', 'seg-8', 'seg-9']),
    };
    expect(hasLastSegmentLoaded(state, owners)).toBe(true);
  });

  it('returns true when track has no segments', () => {
    const track = makeResolvedVideoTrack(0);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    const owners: EndOfStreamOwners = {
      videoBufferActor: makeActorWithSegments([]),
    };
    expect(hasLastSegmentLoaded(state, owners)).toBe(true);
  });

  it('returns false when video last segment is loaded but audio last segment is not', () => {
    const videoTrack = makeResolvedVideoTrack(4);
    const presentation = {
      id: 'pres-1',
      url: 'https://example.com/playlist.m3u8',
      selectionSets: [
        { type: 'video', switchingSets: [{ tracks: [videoTrack] }] },
        {
          type: 'audio',
          switchingSets: [
            {
              tracks: [
                {
                  id: 'audio-1',
                  type: 'audio',
                  segments: makeSegments(4).map((s) => ({ ...s, id: `audio-${s.id}` })),
                },
              ],
            },
          ],
        },
      ],
    } as unknown as Presentation;

    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
      presentation,
    };
    const owners: EndOfStreamOwners = {
      videoBufferActor: makeActorWithSegments(['seg-3'], 'video-1'),
      audioBufferActor: makeActorWithSegments(['audio-seg-0'], 'audio-1'),
    };
    expect(hasLastSegmentLoaded(state, owners)).toBe(false);
  });
});

// ============================================================================
// shouldEndStream
// ============================================================================

describe('shouldEndStream', () => {
  it('returns false when MediaSource is not open', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(
      shouldEndStream(state, {
        mediaSource: makeMediaSource({ readyState: 'ended' }),
        videoBuffer: makeSourceBuffer(),
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      })
    ).toBe(false);
  });

  it('returns false when mediaElement has not reached HAVE_METADATA', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(
      shouldEndStream(state, {
        mediaSource: makeMediaSource(),
        mediaElement: document.createElement('video'), // readyState = HAVE_NOTHING
        videoBuffer: makeSourceBuffer(),
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      })
    ).toBe(false);
  });

  it('returns false when video SourceBuffer is not yet created', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(shouldEndStream(state, { mediaSource: makeMediaSource() })).toBe(false);
  });

  it('returns false when last segment is not yet loaded', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(
      shouldEndStream(state, {
        mediaSource: makeMediaSource(),
        videoBuffer: makeSourceBuffer(),
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1']), // last segment (seg-3) missing
      })
    ).toBe(false);
  });

  it('returns true when last segment is in actor context', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(
      shouldEndStream(state, {
        mediaSource: makeMediaSource(),
        videoBuffer: makeSourceBuffer(),
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      })
    ).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    const track = makeResolvedVideoTrack(10);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(
      shouldEndStream(state, {
        mediaSource: makeMediaSource(),
        videoBuffer: makeSourceBuffer(),
        videoBufferActor: makeActorWithSegments(['seg-7', 'seg-8', 'seg-9']),
      })
    ).toBe(true);
  });
});

// ============================================================================
// endOfStream
// ============================================================================

describe('endOfStream', () => {
  it('calls MediaSource.endOfStream() when last segment is loaded', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    });

    const cleanup = endOfStream({ state, owners });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    cleanup();
  });

  it('calls MediaSource.endOfStream() after back-buffer flushing', async () => {
    const track = makeResolvedVideoTrack(10);
    const mockMs = makeMediaSource();

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });
    // Back buffer flushed, only last few segments remain — last segment still present
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
      videoBufferActor: makeActorWithSegments(['seg-7', 'seg-8', 'seg-9']),
    });

    const cleanup = endOfStream({ state, owners });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    cleanup();
  });

  it('calls endOfStream() only once while MediaSource stays ended', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    // Simulate real MSE behaviour: endOfStream() transitions readyState to 'ended'
    (mockMs.endOfStream as ReturnType<typeof vi.fn>).mockImplementation(() => {
      (mockMs as unknown as { readyState: string }).readyState = 'ended';
    });

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    });

    const cleanup = endOfStream({ state, owners });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // Trigger another state change — readyState is 'ended' so must not call again
    state.patch({ presentation: makePresentation(track) });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('does not call endOfStream() when last segment is not yet loaded', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1']), // missing seg-3
    });

    const cleanup = endOfStream({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    cleanup();
  });

  it('calls endOfStream() again after seek-back re-opens the MediaSource', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    });

    const cleanup = endOfStream({ state, owners });

    // First play-through: endOfStream() is called
    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // Simulate seek-back: appendBuffer() re-opens the MediaSource per MSE spec
    (mockMs as unknown as { readyState: string }).readyState = 'open';

    // Patch owners with a new actor that still has the last segment
    owners.patch({ videoBufferActor: makeActorWithSegments(['seg-2', 'seg-3']) });

    // endOfStream() should be called again
    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(2);
    });

    cleanup();
  });

  it('does not call endOfStream() again while MediaSource is still ended', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
      videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    });

    const cleanup = endOfStream({ state, owners });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // MediaSource stays in 'ended' state (no seek-back append)
    (mockMs as unknown as { readyState: string }).readyState = 'ended';

    // Trigger a state change — should not call endOfStream() again
    state.patch({ presentation: makePresentation(track) });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('calls endOfStream() when actor context is updated to include the last segment', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();
    const neverAborted = new AbortController().signal;

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    });

    // Start with only first two segments loaded
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer, {
      initTrackId: 'video-1',
      segments: [
        { id: 'seg-0', startTime: 0, duration: 2.5, trackId: 'video-1' },
        { id: 'seg-1', startTime: 2.5, duration: 2.5, trackId: 'video-1' },
      ],
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: sourceBuffer,
      videoBufferActor: actor,
    });

    const cleanup = endOfStream({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    // Append the last two segments via the actor — this updates actor context
    // and triggers the actor subscribers that endOfStream watches.
    await actor.batch(
      [
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 'seg-2', startTime: 5, duration: 2.5, trackId: 'video-1' },
        },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 'seg-3', startTime: 7.5, duration: 2.5, trackId: 'video-1' },
        },
      ],
      neverAborted
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    cleanup();
  });
});
