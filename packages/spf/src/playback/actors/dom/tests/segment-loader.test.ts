import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { AudioTrack } from '../../../../media/types';
import { createSegmentLoaderActor } from '../segment-loader';
import type {
  SourceBufferActor,
  SourceBufferActorContext,
  SourceBufferActorState,
  SourceBufferMessage,
} from '../source-buffer';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface MockSourceBufferActor {
  snapshot: ReturnType<typeof signal<{ value: SourceBufferActorState; context: SourceBufferActorContext }>>;
  send: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

function createMockBufferActor(ctx: Partial<SourceBufferActorContext> = {}): MockSourceBufferActor {
  return {
    snapshot: signal<{ value: SourceBufferActorState; context: SourceBufferActorContext }>({
      value: 'idle', // stay idle so waitForIdle resolves immediately
      context: { segments: [], bufferedRanges: [], initTrackId: undefined, ...ctx },
    }),
    send: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeAudioTrack(id: string, overrides: Partial<AudioTrack> = {}): AudioTrack {
  return {
    type: 'audio',
    id,
    url: `http://example.com/${id}.m3u8`,
    bandwidth: 128_000,
    mimeType: 'audio/mp4',
    codecs: ['mp4a.40.2'],
    groupId: 'audio',
    name: id,
    sampleRate: 48000,
    channels: 2,
    startTime: 0,
    duration: 30,
    initialization: { url: `http://example.com/${id}-init.mp4` },
    segments: [
      { id: `${id}-0`, url: `http://example.com/${id}-0.m4s`, startTime: 0, duration: 6 },
      { id: `${id}-1`, url: `http://example.com/${id}-1.m4s`, startTime: 6, duration: 6 },
      { id: `${id}-2`, url: `http://example.com/${id}-2.m4s`, startTime: 12, duration: 6 },
    ],
    ...overrides,
  };
}

// Mock fetchBytes — returns an empty async iterable; segments effectively
// don't append. We only care about which messages the segment-loader
// dispatches to the source-buffer actor, particularly the `remove` for
// cross-rendition flush.
const mockFetchBytes = vi.fn(async () => {
  return (async function* () {})();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSegmentLoaderActor — planTasks cross-rendition switch', () => {
  it('does NOT emit an explicit remove on cross-rendition switch; relies on MSE overwrite-on-append', async () => {
    // Audio renditions share segment IDs and startTimes. Appending the new
    // track's segments at the same timestamps overwrites the old data in
    // the SourceBuffer — no explicit `remove` task needed, and no audible
    // silence-gap during the swap. planTasks emits only the new-track init
    // + new-track segments inside the (formerly-flushed) range.
    const bufferActor = createMockBufferActor({
      initTrackId: 'audio-en',
      initTrackLanguage: 'en',
      segments: [
        { id: 'audio-en-0', startTime: 0, duration: 6, trackId: 'audio-en' },
        { id: 'audio-en-1', startTime: 6, duration: 6, trackId: 'audio-en' },
        { id: 'audio-en-2', startTime: 12, duration: 6, trackId: 'audio-en' },
      ],
      bufferedRanges: [{ start: 0, end: 18 }],
    });

    const loader = createSegmentLoaderActor(bufferActor as unknown as SourceBufferActor, mockFetchBytes);

    const newTrack = makeAudioTrack('audio-es', { language: 'es' });
    // Playhead at 2s (mid-segment-0). currentSegmentStart = 0.
    loader.send({ type: 'load', track: newTrack, range: { start: 2, end: 20 } });

    // Wait for the loader to schedule its work (init + segments).
    await vi.waitFor(() => {
      const initCalls = bufferActor.send.mock.calls.filter((c) => (c[0] as SourceBufferMessage).type === 'append-init');
      expect(initCalls.length).toBeGreaterThan(0);
    });

    // No cross-rendition remove emitted. Forward / back flushes are
    // computed independently and don't fire here (the buffered range is
    // entirely inside the load window, and no back-buffer threshold is
    // crossed at currentTime=2).
    const removeMsgs = bufferActor.send.mock.calls
      .map((c) => c[0] as SourceBufferMessage)
      .filter((m): m is Extract<SourceBufferMessage, { type: 'remove' }> => m.type === 'remove');

    expect(removeMsgs).toHaveLength(0);

    loader.destroy();
  });

  it('does not dispatch cross-rendition flush when languages match (audio-abr-style switch)', async () => {
    // Same language, different track id (e.g., audio bitrate variant in
    // same language group). planTasks should NOT emit a cross-rendition
    // flush — appending new segments overwrites time-aligned ranges.
    const bufferActor = createMockBufferActor({
      initTrackId: 'audio-en-128k',
      initTrackLanguage: 'en',
      segments: [{ id: 'audio-en-128k-0', startTime: 0, duration: 6, trackId: 'audio-en-128k' }],
      bufferedRanges: [{ start: 0, end: 6 }],
    });

    const loader = createSegmentLoaderActor(bufferActor as unknown as SourceBufferActor, mockFetchBytes);

    const newTrack = makeAudioTrack('audio-en-256k', { language: 'en' });
    loader.send({ type: 'load', track: newTrack, range: { start: 2, end: 20 } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const crossRenditionRemove = bufferActor.send.mock.calls
      .map((c) => c[0] as SourceBufferMessage)
      .find(
        (m): m is Extract<SourceBufferMessage, { type: 'remove' }> =>
          m.type === 'remove' && m.start > 0 && m.end === Infinity
      );

    // Note: a forward-buffer flush may fire with start === forwardFlushPoint
    // and end === Infinity, but only when the buffer overflows the forward
    // target. The cross-rendition flush has start === nextSegmentBoundary.
    // Since languages match here, NO cross-rendition flush should fire.
    // (Forward-buffer flush with a small forward-buffer is independent.)
    expect(crossRenditionRemove?.start).not.toBe(6);

    loader.destroy();
  });

  it('does not dispatch cross-rendition flush on initial load (no prior initTrackId)', async () => {
    // No buffered track yet (initTrackId undefined). First load is the
    // initial setup — should emit append-init but no cross-rendition flush.
    const bufferActor = createMockBufferActor();
    const loader = createSegmentLoaderActor(bufferActor as unknown as SourceBufferActor, mockFetchBytes);

    const track = makeAudioTrack('audio-en', { language: 'en' });
    loader.send({ type: 'load', track, range: { start: 0, end: 20 } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const removeCalls = bufferActor.send.mock.calls.filter((c) => (c[0] as SourceBufferMessage).type === 'remove');
    expect(removeCalls).toHaveLength(0);

    loader.destroy();
  });

  it('schedules new-track segments inside the cross-rendition stale range (including current segment)', async () => {
    // Cross-rendition audio renditions share segment IDs and startTimes
    // (e.g., every variant has its own `segment-1` at startTime=6).
    // planTasks treats the range from `currentSegmentStart` forward as
    // stale (will be overwritten by new appends via MSE
    // overwrite-on-append) and re-schedules every new-track segment in
    // that range — including the segment containing the playhead. The
    // pre-flush `bufferedSegments` snapshot would otherwise mark those
    // same-startTime new-track segments "already buffered" and skip them.
    const bufferActor = createMockBufferActor({
      initTrackId: 'audio-en',
      initTrackLanguage: 'en',
      // Buffered seg-0 (0-6), seg-1 (6-12), seg-2 (12-18).
      segments: [
        { id: 'audio-en-0', startTime: 0, duration: 6, trackId: 'audio-en' },
        { id: 'audio-en-1', startTime: 6, duration: 6, trackId: 'audio-en' },
        { id: 'audio-en-2', startTime: 12, duration: 6, trackId: 'audio-en' },
      ],
      bufferedRanges: [{ start: 0, end: 18 }],
    });

    const loader = createSegmentLoaderActor(bufferActor as unknown as SourceBufferActor, mockFetchBytes);

    const newTrack = makeAudioTrack('audio-es', { language: 'es' });
    // Playhead at 2s (mid-seg-0). currentSegmentStart = 0 → stale range
    // is [0, Infinity). All three segments overlap and must be re-scheduled.
    loader.send({ type: 'load', track: newTrack, range: { start: 2, end: 20 } });

    await vi.waitFor(() => {
      const appendSegmentCalls = bufferActor.send.mock.calls.filter(
        (c) => (c[0] as SourceBufferMessage).type === 'append-segment'
      );
      expect(appendSegmentCalls.length).toBeGreaterThan(0);
    });

    const segmentStartTimes = bufferActor.send.mock.calls
      .map((c) => c[0] as SourceBufferMessage)
      .filter((m): m is Extract<SourceBufferMessage, { type: 'append-segment' }> => m.type === 'append-segment')
      .map((m) => m.meta.startTime);

    // The current segment (startTime 0, containing playhead at 2) is
    // re-scheduled so the audible switch happens within milliseconds
    // of the new-track segment landing rather than waiting for the next
    // boundary.
    expect(segmentStartTimes).toContain(0);
    expect(segmentStartTimes).toContain(6);
    expect(segmentStartTimes).toContain(12);

    loader.destroy();
  });

  it('captures language into append-init meta for downstream tracking', async () => {
    // Verify that planTasks includes `language` in the append-init meta
    // so the SourceBufferActor can capture initTrackLanguage on commit.
    const bufferActor = createMockBufferActor();
    const loader = createSegmentLoaderActor(bufferActor as unknown as SourceBufferActor, mockFetchBytes);

    const track = makeAudioTrack('audio-es', { language: 'es' });
    loader.send({ type: 'load', track, range: { start: 0, end: 20 } });

    await vi.waitFor(() => {
      const initCall = bufferActor.send.mock.calls.find((c) => (c[0] as SourceBufferMessage).type === 'append-init');
      expect(initCall).toBeDefined();
    });

    const initMsg = bufferActor.send.mock.calls
      .map((c) => c[0] as SourceBufferMessage)
      .find((m): m is Extract<SourceBufferMessage, { type: 'append-init' }> => m.type === 'append-init')!;

    expect(initMsg.meta.trackId).toBe('audio-es');
    expect(initMsg.meta.language).toBe('es');

    loader.destroy();
  });
});
