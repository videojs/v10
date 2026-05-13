import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation, Segment, VideoTrack } from '../../../../media/types';
import { createSourceBufferActor, type SourceBufferActor } from '../../../actors/dom/source-buffer';
import { type EndOfStreamContext, type EndOfStreamState, endOfStream } from '../end-of-stream';

function makeState(initial: EndOfStreamState = {}): StateSignals<EndOfStreamState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    currentTime: signal<number | undefined>(initial.currentTime),
  };
}

function makeContext(initial: EndOfStreamContext = {}): ContextSignals<EndOfStreamContext> {
  return {
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
    videoBufferActor: signal<SourceBufferActor | undefined>(initial.videoBufferActor),
    audioBufferActor: signal<SourceBufferActor | undefined>(initial.audioBufferActor),
  };
}

function setupEndOfStream(initialState: EndOfStreamState, initialContext: EndOfStreamContext) {
  // Default `currentTime` well past any test scenario's last-segment startTime
  // — tests that exercise the currentTime gate pass their own value.
  const state = makeState({ currentTime: 1000, ...initialState });
  const context = makeContext(initialContext);
  const cleanup = endOfStream.setup({ state, context });
  return { state, context, cleanup };
}

// ============================================================================
// Mock helpers
// ============================================================================

/**
 * Back the mock with a real EventTarget so tests can dispatch sourceopen /
 * sourceended to exercise the behavior's local readyState subscription.
 */
function makeMediaSource(
  overrides: { readyState?: MediaSource['readyState']; duration?: number; sourceBuffers?: SourceBuffer[] } = {}
): MediaSource {
  const target = new EventTarget();
  const ms = Object.create(MediaSource.prototype, {
    readyState: { value: overrides.readyState ?? 'open', writable: true },
    duration: { value: overrides.duration ?? 0, writable: true },
    sourceBuffers: { value: (overrides.sourceBuffers ?? []) as unknown as SourceBufferList, writable: false },
    addEventListener: { value: target.addEventListener.bind(target) },
    removeEventListener: { value: target.removeEventListener.bind(target) },
    dispatchEvent: { value: target.dispatchEvent.bind(target) },
  }) as MediaSource;
  ms.endOfStream = vi.fn();
  return ms;
}

function transitionMediaSource(mediaSource: MediaSource, readyState: MediaSource['readyState'], eventType: string) {
  (mediaSource as MediaSource & { readyState: MediaSource['readyState'] }).readyState = readyState;
  mediaSource.dispatchEvent(new Event(eventType));
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
// endOfStream
// ============================================================================

describe('endOfStream', () => {
  it('calls MediaSource.endOfStream() when the last segment is loaded', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const { cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    await cleanup();
  });

  it('calls MediaSource.endOfStream() after back-buffer flushing', async () => {
    const track = makeResolvedVideoTrack(10);
    const mockMs = makeMediaSource();

    const { cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        // Back buffer flushed; last segment still present.
        videoBufferActor: makeActorWithSegments(['seg-7', 'seg-8', 'seg-9']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    await cleanup();
  });

  it('does not call endOfStream() when MediaSource is not open', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource({ readyState: 'ended' });

    const { cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    await cleanup();
  });

  it('does not call endOfStream() when currentTime has not reached the last segment', async () => {
    const track = makeResolvedVideoTrack(4); // lastSeg.startTime = 7.5
    const mockMs = makeMediaSource();

    const { cleanup } = setupEndOfStream(
      {
        presentation: makePresentation(track),
        currentTime: 5, // mid-stream
      },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    await cleanup();
  });

  it('fires once currentTime reaches the last segment startTime', async () => {
    const track = makeResolvedVideoTrack(4); // lastSeg.startTime = 7.5
    const mockMs = makeMediaSource();

    const { state, cleanup } = setupEndOfStream(
      {
        presentation: makePresentation(track),
        currentTime: 5,
      },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    state.currentTime.set(7.5);

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    await cleanup();
  });

  it('does not call endOfStream() when last segment is not yet loaded', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const { cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    await cleanup();
  });

  it('calls endOfStream() once the actor receives the last segment', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer, {
      initTrackId: 'video-1',
      segments: [
        { id: 'seg-0', startTime: 0, duration: 2.5, trackId: 'video-1' },
        { id: 'seg-1', startTime: 2.5, duration: 2.5, trackId: 'video-1' },
      ],
    });

    const { cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      { mediaSource: mockMs, videoBufferActor: actor }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    actor.send({
      type: 'batch',
      messages: [
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
    });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    await cleanup();
  });

  it('calls endOfStream() only once while MediaSource stays ended', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    // Real MSE: endOfStream() flips readyState to 'ended' synchronously
    // and dispatches `sourceended`.
    (mockMs.endOfStream as ReturnType<typeof vi.fn>).mockImplementation(() => {
      transitionMediaSource(mockMs, 'ended', 'sourceended');
    });

    const { state, cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // Force re-evaluation (presentation replace) while MS stays 'ended'.
    state.presentation.set(makePresentation(track));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    await cleanup();
  });

  it('calls endOfStream() again after seek-back re-opens the MediaSource', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    (mockMs.endOfStream as ReturnType<typeof vi.fn>).mockImplementation(() => {
      transitionMediaSource(mockMs, 'ended', 'sourceended');
    });

    const { cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // Seek-back: appendBuffer() re-opens the MediaSource per MSE spec —
    // the `sourceopen` event drives the behavior's local mirror back to
    // 'open' and re-arms the reactor.
    transitionMediaSource(mockMs, 'open', 'sourceopen');

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(2);
    });
    await cleanup();
  });

  it('aborts in-flight wait when presentation is cleared mid-flight', async () => {
    const track = makeResolvedVideoTrack(4);
    // SourceBuffer that stays `updating` so waitForSourceBuffersReady
    // never resolves on its own.
    const buffer = {
      buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
      updating: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as SourceBuffer;
    const mockMs = makeMediaSource({ sourceBuffers: [buffer] });

    const { state, cleanup } = setupEndOfStream(
      { presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    state.presentation.set(undefined);

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    await cleanup();
  });

  it('composes against an audio-only configuration', async () => {
    // Audio-only: only audioBufferActor in scope; the behavior iterates
    // whatever's present without per-type-specialized paths.
    const audioTrack = {
      id: 'audio-1',
      type: 'audio',
      url: 'https://example.com/audio.m3u8',
      mimeType: 'audio/mp4',
      segments: makeSegments(4).map((s) => ({ ...s, id: `audio-${s.id}` })),
    } as unknown as VideoTrack;
    const presentation = {
      id: 'pres-1',
      url: 'https://example.com/playlist.m3u8',
      selectionSets: [{ type: 'audio', switchingSets: [{ tracks: [audioTrack] }] }],
    } as unknown as Presentation;

    const mockMs = makeMediaSource();
    const audioBufferActor = makeActorWithSegments(
      ['audio-seg-0', 'audio-seg-1', 'audio-seg-2', 'audio-seg-3'],
      'audio-1'
    );

    const { cleanup } = setupEndOfStream({ presentation }, { mediaSource: mockMs, audioBufferActor });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    await cleanup();
  });
});
