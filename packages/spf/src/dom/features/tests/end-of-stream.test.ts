import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation, Segment, VideoTrack } from '../../../core/types';
import {
  canEndStream,
  type EndOfStreamOwners,
  type EndOfStreamState,
  endOfStream,
  hasLastSegmentLoaded,
  shouldEndStream,
} from '../end-of-stream';
import type { BufferState } from '../load-segments';

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

function makeSourceBuffer(bufferedRanges: Array<[number, number]> = []): SourceBuffer {
  const timeRanges = {
    length: bufferedRanges.length,
    start: (i: number) => bufferedRanges[i]![0],
    end: (i: number) => bufferedRanges[i]![1],
  } as TimeRanges;
  return Object.create(SourceBuffer.prototype, {
    updating: { value: false, writable: true },
    buffered: { value: timeRanges, writable: false },
  }) as SourceBuffer;
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

function bufferStateWithSegments(ids: string[], type: 'video' | 'audio' = 'video'): BufferState {
  return { [type]: { segments: ids.map((id) => ({ id, trackId: 'video-1' })) } };
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
    expect(hasLastSegmentLoaded({ presentation: { id: 'p', url: 'x' } as Presentation })).toBe(true);
  });

  it('returns false when last segment ID is not in bufferState', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      // seg-3 (the last segment) is missing
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2'], 'video'),
    };
    expect(hasLastSegmentLoaded(state)).toBe(false);
  });

  it('returns true when last segment ID is present (seek-back scenario)', () => {
    const track = makeResolvedVideoTrack(10);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      // Last segment is in the SourceBuffer from a prior play-through (pipeline mid-reload).
      // Per the MSE spec, if the last segment is physically present calling endOfStream
      // is correct regardless of where the loading pipeline currently is.
      bufferState: bufferStateWithSegments(['seg-0', 'seg-7', 'seg-8', 'seg-9'], 'video'),
    };
    expect(hasLastSegmentLoaded(state)).toBe(true);
  });

  it('returns true when last segment ID is in bufferState', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video'),
    };
    expect(hasLastSegmentLoaded(state)).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    const track = makeResolvedVideoTrack(10);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      // early segments flushed, last segment still present
      bufferState: bufferStateWithSegments(['seg-7', 'seg-8', 'seg-9'], 'video'),
    };
    expect(hasLastSegmentLoaded(state)).toBe(true);
  });

  it('returns true when track has no segments', () => {
    const track = makeResolvedVideoTrack(0);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments([], 'video'),
    };
    expect(hasLastSegmentLoaded(state)).toBe(true);
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
      bufferState: {
        video: { segments: [{ id: 'seg-3', trackId: 'video-1' }] },
        audio: { segments: [{ id: 'audio-seg-0', trackId: 'audio-1' }] },
      },
    };
    expect(hasLastSegmentLoaded(state)).toBe(false);
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
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    };
    expect(
      shouldEndStream(state, { mediaSource: makeMediaSource({ readyState: 'ended' }), videoBuffer: makeSourceBuffer() })
    ).toBe(false);
  });

  it('returns false when mediaElement has not reached HAVE_METADATA', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    };
    expect(
      shouldEndStream(state, {
        mediaSource: makeMediaSource(),
        mediaElement: document.createElement('video'), // readyState = HAVE_NOTHING
        videoBuffer: makeSourceBuffer(),
      })
    ).toBe(false);
  });

  it('returns false when video SourceBuffer is not yet created', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3']),
    };
    expect(shouldEndStream(state, { mediaSource: makeMediaSource() })).toBe(false);
  });

  it('returns false when last segment is not yet loaded', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1']), // last segment (seg-3) missing
    };
    expect(shouldEndStream(state, { mediaSource: makeMediaSource(), videoBuffer: makeSourceBuffer() })).toBe(false);
  });

  it('returns true when last segment is in bufferState', () => {
    const track = makeResolvedVideoTrack(4);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video'),
    };
    expect(shouldEndStream(state, { mediaSource: makeMediaSource(), videoBuffer: makeSourceBuffer() })).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    const track = makeResolvedVideoTrack(10);
    const state: EndOfStreamState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-7', 'seg-8', 'seg-9'], 'video'),
    };
    expect(shouldEndStream(state, { mediaSource: makeMediaSource(), videoBuffer: makeSourceBuffer() })).toBe(true);
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
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video'),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
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
      // Back buffer flushed, only last few segments remain — last segment still present
      bufferState: bufferStateWithSegments(['seg-7', 'seg-8', 'seg-9'], 'video'),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
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
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video'),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
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
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1']), // missing seg-3
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
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
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video'),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
    });

    const cleanup = endOfStream({ state, owners });

    // First play-through: endOfStream() is called
    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    // Simulate seek-back: appendBuffer() re-opens the MediaSource per MSE spec
    (mockMs as unknown as { readyState: string }).readyState = 'open';

    // Trigger a state change. The last segment (seg-3) is still in the buffer
    // (back-buffer flush removed early segments) so endOfStream fires immediately.
    state.patch({ bufferState: bufferStateWithSegments(['seg-2', 'seg-3'], 'video') });

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
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video'),
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
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

  it('calls endOfStream() when bufferState is updated to include the last segment', async () => {
    const track = makeResolvedVideoTrack(4);
    const mockMs = makeMediaSource();

    const state = createState<EndOfStreamState>({
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
      bufferState: bufferStateWithSegments(['seg-0', 'seg-1']), // not done yet
    });
    const owners = createState<EndOfStreamOwners>({
      mediaSource: mockMs,
      videoBuffer: makeSourceBuffer(),
    });

    const cleanup = endOfStream({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMs.endOfStream).not.toHaveBeenCalled();

    // Last segment appended — loadSegments adds it to bufferState.segments
    state.patch({ bufferState: bufferStateWithSegments(['seg-0', 'seg-1', 'seg-2', 'seg-3'], 'video') });

    await vi.waitFor(() => {
      expect(mockMs.endOfStream).toHaveBeenCalledTimes(1);
    });

    cleanup();
  });
});
