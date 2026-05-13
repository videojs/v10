import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation, Segment, VideoTrack } from '../../../../media/types';
import { createSourceBufferActor, type SourceBufferActor } from '../../../actors/dom/source-buffer';
import { type EndOfStreamContext, type EndOfStreamState, endOfStream } from '../end-of-stream';

function makeState(initial: EndOfStreamState = {}): StateSignals<EndOfStreamState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    mediaSourceReadyState: signal<MediaSource['readyState'] | undefined>(initial.mediaSourceReadyState),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    currentTime: signal<number | undefined>(initial.currentTime),
  };
}

function makeContext(initial: EndOfStreamContext = {}): ContextSignals<EndOfStreamContext> {
  return {
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
    mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement),
    videoBufferActor: signal<SourceBufferActor | undefined>(initial.videoBufferActor),
    audioBufferActor: signal<SourceBufferActor | undefined>(initial.audioBufferActor),
  };
}

function setupEndOfStream(initialState: EndOfStreamState, initialContext: EndOfStreamContext) {
  // Default `mediaSourceReadyState` to 'open' and `currentTime` well past
  // any test scenario's last-segment startTime — tests that exercise the
  // gates pass their own values.
  const state = makeState({ mediaSourceReadyState: 'open', currentTime: 1000, ...initialState });
  const context = makeContext(initialContext);
  const reactor = endOfStream.setup({ state, context });
  return { state, context, reactor };
}

// ============================================================================
// Mock helpers
// ============================================================================

function makeMediaSource(
  overrides: { readyState?: string; duration?: number; sourceBuffers?: SourceBuffer[] } = {}
): MediaSource {
  const ms = Object.create(MediaSource.prototype, {
    readyState: { value: overrides.readyState ?? 'open', writable: true },
    duration: { value: overrides.duration ?? 0, writable: true },
    sourceBuffers: { value: (overrides.sourceBuffers ?? []) as unknown as SourceBufferList, writable: false },
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
  it('calls MediaSource.endOfStream() when last segment is loaded', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const { reactor } = setupEndOfStream(
      { selectedVideoTrackId: 'video-1', presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    reactor.destroy();
  });

  it('calls MediaSource.endOfStream() after back-buffer flushing', async () => {
    const track = makeResolvedVideoTrack(10);
    const mockMs = makeMediaSource();

    const { reactor } = setupEndOfStream(
      { selectedVideoTrackId: 'video-1', presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        // Back buffer flushed; last segment still present.
        videoBufferActor: makeActorWithSegments(['seg-7', 'seg-8', 'seg-9']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    reactor.destroy();
  });

  it('does not call endOfStream() when MediaSource is not open', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource({ readyState: 'ended' });

    const { reactor } = setupEndOfStream(
      {
        selectedVideoTrackId: 'video-1',
        presentation: makePresentation(track),
        mediaSourceReadyState: 'ended',
      },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    reactor.destroy();
  });

  it('does not call endOfStream() when currentTime has not reached the last segment', async () => {
    const track = makeResolvedVideoTrack(4); // lastSeg.startTime = 7.5
    const mockMs = makeMediaSource();

    const { reactor } = setupEndOfStream(
      {
        selectedVideoTrackId: 'video-1',
        presentation: makePresentation(track),
        currentTime: 5, // mid-stream — user hasn't reached the end
      },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    reactor.destroy();
  });

  it('fires once currentTime reaches the last segment startTime', async () => {
    const track = makeResolvedVideoTrack(4); // lastSeg.startTime = 7.5
    const mockMs = makeMediaSource();

    const { state, reactor } = setupEndOfStream(
      {
        selectedVideoTrackId: 'video-1',
        presentation: makePresentation(track),
        currentTime: 5, // start mid-stream
      },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    // Playback ticks to the last segment — reactor transitions to eos-ready.
    state.currentTime.set(7.5);

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });
    reactor.destroy();
  });

  it('does not call endOfStream() when last segment is not yet loaded', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const { reactor } = setupEndOfStream(
      { selectedVideoTrackId: 'video-1', presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1']), // missing seg-2, seg-3
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    reactor.destroy();
  });

  it('calls endOfStream() once when actor context is updated to include the last segment', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();
    // Start with only first two segments loaded.
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer, {
      initTrackId: 'video-1',
      segments: [
        { id: 'seg-0', startTime: 0, duration: 2.5, trackId: 'video-1' },
        { id: 'seg-1', startTime: 2.5, duration: 2.5, trackId: 'video-1' },
      ],
    });

    const { reactor } = setupEndOfStream(
      { selectedVideoTrackId: 'video-1', presentation: makePresentation(track) },
      { mediaSource: mockMs, videoBufferActor: actor }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    // Append the remaining segments via the actor — its snapshot signal
    // re-fires and the reactor transitions to 'eos-ready'.
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
    reactor.destroy();
  });

  it('calls endOfStream() only once while MediaSource stays ended', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    // Simulate real MSE: endOfStream() transitions readyState to 'ended' and
    // setupMediaSource's mirror would write 'ended' into state.
    (mockMs.endOfStream as ReturnType<typeof vi.fn>).mockImplementation(() => {
      (mockMs as unknown as { readyState: string }).readyState = 'ended';
    });

    const { state, reactor } = setupEndOfStream(
      { selectedVideoTrackId: 'video-1', presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // setupMediaSource's mirror would have set 'ended' — match that here.
    state.mediaSourceReadyState.set('ended');

    // Force a re-evaluation (presentation re-set) while still 'ended'.
    state.presentation.set(makePresentation(track));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    reactor.destroy();
  });

  it('calls endOfStream() again after seek-back re-opens the MediaSource', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const { state, reactor } = setupEndOfStream(
      {
        selectedVideoTrackId: 'video-1',
        presentation: makePresentation(track),
        mediaSourceReadyState: 'open',
      },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    // Simulate real MSE: endOfStream() transitions readyState to 'ended'.
    (mockMs.endOfStream as ReturnType<typeof vi.fn>).mockImplementation(() => {
      (mockMs as unknown as { readyState: string }).readyState = 'ended';
      state.mediaSourceReadyState.set('ended');
    });

    // First play-through.
    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // Seek-back: appendBuffer() re-opens the MediaSource per MSE spec; the
    // mirror flips state.mediaSourceReadyState back to 'open'.
    (mockMs as unknown as { readyState: string }).readyState = 'open';
    state.mediaSourceReadyState.set('open');

    // Reactor re-enters 'eos-ready' and re-fires endOfStream().
    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(2);
    });
    reactor.destroy();
  });

  it('aborts in-flight wait when presentation is cleared mid-flight', async () => {
    const track = makeResolvedVideoTrack(4);
    // Use a buffer that stays in 'updating' so the wait-for-ready never
    // resolves on its own.
    const buffer = {
      buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
      updating: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as SourceBuffer;
    const mockMs = makeMediaSource({ sourceBuffers: [buffer] });

    const { state, reactor } = setupEndOfStream(
      { selectedVideoTrackId: 'video-1', presentation: makePresentation(track) },
      {
        mediaSource: mockMs,
        videoBufferActor: makeActorWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
      }
    );

    // Behavior is awaiting waitForSourceBuffersReady — clear presentation.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    state.presentation.set(undefined);

    // Even if the buffer eventually settles (it won't here, but simulate
    // anyway), the abort should have prevented the endOfStream call.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();
    reactor.destroy();
  });
});
