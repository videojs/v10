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

describe('createSegmentLoaderActor — planTasks cross-rendition flush', () => {
  it('dispatches `remove` from next segment boundary on audio language switch', async () => {
    // Simulate that the audio buffer has already been initialized with 'en'
    // and has some buffered segments. Then load the 'es' track — planTasks
    // should detect the language difference and schedule a `remove` task
    // covering the ahead-buffer from the next segment boundary forward.
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
    // Playhead at 2s (mid-segment-0). Next boundary at 6s (start of segment 1).
    loader.send({ type: 'load', track: newTrack, range: { start: 2, end: 20 } });

    // The first scheduled task is the flush. Wait for the send to fire.
    await vi.waitFor(() => {
      const removeCalls = bufferActor.send.mock.calls.filter((c) => (c[0] as SourceBufferMessage).type === 'remove');
      expect(removeCalls.length).toBeGreaterThan(0);
    });

    const removeMsg = bufferActor.send.mock.calls
      .map((c) => c[0] as SourceBufferMessage)
      .find((m): m is Extract<SourceBufferMessage, { type: 'remove' }> => m.type === 'remove' && m.start === 6);

    expect(removeMsg).toBeDefined();
    expect(removeMsg!.start).toBe(6);
    expect(removeMsg!.end).toBe(Infinity);

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
