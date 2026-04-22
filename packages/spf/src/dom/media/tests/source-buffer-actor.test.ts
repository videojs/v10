import { describe, expect, it, vi } from 'vitest';
import { effect } from '../../../core/signals/effect';
import { createSourceBufferActor } from '../source-buffer-actor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal SourceBuffer mock.
 *
 * Pass `appendRanges` to simulate realistic buffered state: each entry is
 * added to `buffered` in sequence as `appendBuffer` is called. `remove()`
 * clips the ranges to match what a real SourceBuffer would report, enabling
 * the midpoint-based segment model logic in removeTask to be tested correctly.
 */
function makeSourceBuffer(appendRanges: Array<[number, number]> = []): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};
  let appendIndex = 0;
  let ranges: Array<[number, number]> = [];

  const clipRanges = (start: number, end: number) => {
    const next: Array<[number, number]> = [];
    for (const [s, e] of ranges) {
      if (e <= start || s >= end) {
        next.push([s, e]);
      } else {
        if (s < start) next.push([s, start]);
        if (e > end) next.push([end, e]);
      }
    }
    ranges = next;
  };

  return {
    get buffered() {
      return {
        get length() {
          return ranges.length;
        },
        start: (i: number) => ranges[i]![0],
        end: (i: number) => ranges[i]![1],
      } as TimeRanges;
    },
    updating: false,
    appendBuffer: vi.fn(() => {
      const range = appendRanges[appendIndex++];
      if (range) ranges.push(range);
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
          listener(new Event('updateend'));
        }
      }, 0);
    }),
    remove: vi.fn((start: number, end: number) => {
      clipRanges(start, end);
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
          listener(new Event('updateend'));
        }
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

describe('createSourceBufferActor', () => {
  // ---------------------------------------------------------------------------
  // State guard — messages rejected when not idle
  // ---------------------------------------------------------------------------

  it('silently drops send() when actor is updating', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // state transitions to 'updating' synchronously, so the second send() in
    // the same tick sees 'updating' and is dropped.
    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } });
    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } });

    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));
    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1);
    expect(actor.snapshot.get().context.initTrackId).toBe('track-1');

    actor.destroy();
  });

  it('accepts send() again once idle', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } });
    await vi.waitFor(() => expect(actor.snapshot.get().context.initTrackId).toBe('track-2'));

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Batch — individual tasks, context threading
  // ---------------------------------------------------------------------------

  it('batch message executes all messages in order as individual tasks', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({
      type: 'batch',
      messages: [
        { type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        },
      ],
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(2);
    expect(actor.snapshot.get().context.initTrackId).toBe('track-1');
    expect(actor.snapshot.get().context.segments).toHaveLength(1);

    actor.destroy();
  });

  it('batch message threads context between tasks so overlap detection works', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // Two segments at the same time range — the second should replace the first
    actor.send({
      type: 'batch',
      messages: [
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's1-low', startTime: 0, duration: 10, trackId: 'track-low' },
        },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's1-high', startTime: 0, duration: 10, trackId: 'track-high' },
        },
      ],
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    const ids = actor.snapshot.get().context.segments.map((s) => s.id);
    expect(ids).not.toContain('s1-low');
    expect(ids).toContain('s1-high');
    expect(actor.snapshot.get().context.segments).toHaveLength(1);

    actor.destroy();
  });

  it('batch message status stays idle until after last task completes', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const stateValues: string[] = [];
    const cleanup = effect(() => {
      stateValues.push(actor.snapshot.get().value);
    });

    actor.send({
      type: 'batch',
      messages: [
        { type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        },
      ],
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));
    cleanup();

    // Initial idle (immediate subscribe fire) → updating → idle
    // No intermediate context-update-while-updating snapshots
    expect(stateValues).toContain('updating');
    expect(stateValues[stateValues.length - 1]).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Abort: before start
  // ---------------------------------------------------------------------------

  it('cancel during batch skips tasks not yet started', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // Intercept appendBuffer to send cancel after the first task starts,
    // before the second task has a chance to run.
    const appendMock = vi.mocked(sourceBuffer.appendBuffer);
    const origImpl = appendMock.getMockImplementation();
    let firstCall = true;
    appendMock.mockImplementation((data: BufferSource) => {
      if (firstCall) {
        firstCall = false;
        actor.send({ type: 'cancel' });
      }
      return origImpl?.(data);
    });

    actor.send({
      type: 'batch',
      messages: [
        { type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        },
      ],
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1);

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Abort: during batch execution
  // ---------------------------------------------------------------------------

  it('cancel while updating returns actor to idle', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } });
    // Actor is now in 'updating' — cancel should abort tasks and return to idle.
    actor.send({ type: 'cancel' });

    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // append-init
  // ---------------------------------------------------------------------------

  it('sets initTrackId in context and transitions back to idle after append-init', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    expect(actor.snapshot.get().context.initTrackId).toBe('track-1');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // append-segment
  // ---------------------------------------------------------------------------

  it('adds entry to context.segments and transitions back to idle after append-segment', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({
      type: 'append-segment',
      data: new ArrayBuffer(8),
      meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    expect(actor.snapshot.get().context.segments).toHaveLength(1);
    expect(actor.snapshot.get().context.segments[0]).toMatchObject({
      id: 's1',
      startTime: 0,
      duration: 10,
      trackId: 'track-1',
    });
    expect(actor.snapshot.get().value).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // append-segment: quality replacement
  // ---------------------------------------------------------------------------

  it('removes overlapping segment from context on quality replacement', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({
      type: 'append-segment',
      data: new ArrayBuffer(8),
      meta: { id: 's1-low', startTime: 0, duration: 10, trackId: 'track-low' },
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    actor.send({
      type: 'append-segment',
      data: new ArrayBuffer(8),
      meta: { id: 's1-high', startTime: 0, duration: 10, trackId: 'track-high' },
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    const ids = actor.snapshot.get().context.segments.map((s) => s.id);
    expect(ids).not.toContain('s1-low');
    expect(ids).toContain('s1-high');
    expect(actor.snapshot.get().context.segments).toHaveLength(1);

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  it('removes segments whose midpoint falls outside the post-flush buffered ranges', async () => {
    // Provide append ranges so the mock can simulate realistic buffered state.
    const sourceBuffer = makeSourceBuffer([
      [0, 10],
      [10, 20],
      [20, 30],
    ]);
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({
      type: 'batch',
      messages: [
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's2', startTime: 10, duration: 10, trackId: 'track-1' },
        },
        {
          type: 'append-segment',
          data: new ArrayBuffer(8),
          meta: { id: 's3', startTime: 20, duration: 10, trackId: 'track-1' },
        },
      ],
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    // Remove at a segment boundary so midpoints cleanly fall inside or outside.
    actor.send({ type: 'remove', start: 0, end: 20 });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    expect(sourceBuffer.remove).toHaveBeenCalledWith(0, 20);
    const ids = actor.snapshot.get().context.segments.map((s) => s.id);
    expect(ids).not.toContain('s1');
    expect(ids).not.toContain('s2');
    expect(ids).toContain('s3');
    expect(actor.snapshot.get().value).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------

  it('transitions to "updating" during send and back to "idle" after', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const stateValues: string[] = [];
    const cleanup = effect(() => {
      stateValues.push(actor.snapshot.get().value);
    });

    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    cleanup();

    // Initial 'idle' (from immediate subscribe fire) → 'updating' → 'idle'
    expect(stateValues).toContain('updating');
    expect(stateValues[stateValues.length - 1]).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // subscribe
  // ---------------------------------------------------------------------------

  it('snapshot.get() returns the current snapshot', () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    expect(actor.snapshot.get()).toMatchObject({ value: 'idle', context: { segments: [], bufferedRanges: [] } });

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // destroy()
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Partial segment state — streaming AsyncIterable appends
  // ---------------------------------------------------------------------------

  it('does not emit a partial snapshot for ArrayBuffer appends', async () => {
    const sourceBuffer = makeSourceBuffer([[0, 10]]);
    const actor = createSourceBufferActor(sourceBuffer);

    const snapshots: ReturnType<typeof actor.snapshot.get>[] = [];
    const cleanup = effect(() => {
      snapshots.push(actor.snapshot.get());
    });

    actor.send({
      type: 'append-segment',
      data: new ArrayBuffer(8),
      meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));
    cleanup();

    const hadPartial = snapshots.some((s) => s.context.segments.some((seg) => seg.partial));
    expect(hadPartial).toBe(false);

    actor.destroy();
  });

  it('emits a partial:true snapshot before completing a streaming append', async () => {
    const sourceBuffer = makeSourceBuffer([[0, 10]]);
    const actor = createSourceBufferActor(sourceBuffer);

    const snapshots: ReturnType<typeof actor.snapshot.get>[] = [];
    const cleanup = effect(() => {
      const s = actor.snapshot.get();
      snapshots.push({ ...s, context: { ...s.context, segments: [...s.context.segments] } });
    });

    async function* twoChunks() {
      yield new Uint8Array(4);
      yield new Uint8Array(4);
    }

    actor.send({
      type: 'append-segment',
      data: twoChunks(),
      meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));
    cleanup();

    const partialSnapshot = snapshots.find((s) =>
      s.context.segments.some((seg) => seg.id === 's1' && seg.partial === true)
    );
    expect(partialSnapshot).toBeDefined();

    actor.destroy();
  });

  it('clears partial flag on segment after streaming append completes', async () => {
    const sourceBuffer = makeSourceBuffer([[0, 10]]);
    const actor = createSourceBufferActor(sourceBuffer);

    async function* oneChunk() {
      yield new Uint8Array(8);
    }

    actor.send({
      type: 'append-segment',
      data: oneChunk(),
      meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
    });
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    const seg = actor.snapshot.get().context.segments.find((s) => s.id === 's1');
    expect(seg).toBeDefined();
    expect(seg?.partial).toBeUndefined();

    actor.destroy();
  });

  it('leaves partial:true entry in context when streaming append is cancelled', async () => {
    // Use a controllable iterable that pauses, allowing cancel mid-stream
    let resolveFirst: () => void;
    const firstChunkReady = new Promise<void>((r) => {
      resolveFirst = r;
    });

    async function* pausingStream() {
      yield new Uint8Array(4);
      // Pause here — cancel will fire before the second chunk
      await firstChunkReady;
      yield new Uint8Array(4);
    }

    const sourceBuffer = makeSourceBuffer([
      [0, 5],
      [5, 10],
    ]);
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({
      type: 'append-segment',
      data: pausingStream(),
      meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
    });

    // Wait until partial state is emitted (first chunk queued)
    await vi.waitFor(() => {
      expect(actor.snapshot.get().context.segments.some((s) => s.id === 's1' && s.partial === true)).toBe(true);
    });

    // Cancel — aborts the runner's tasks; stream is paused waiting for resolveFirst
    actor.send({ type: 'cancel' });
    resolveFirst!();

    // Wait for the actor to settle back to idle after the cancelled task
    await vi.waitFor(() => expect(actor.snapshot.get().value).toBe('idle'));

    // partial: true entry should remain — accurately reflects data in SourceBuffer
    const seg = actor.snapshot.get().context.segments.find((s) => s.id === 's1');
    expect(seg).toBeDefined();
    expect(seg?.partial).toBe(true);

    actor.destroy();
  });

  it('replaces a partial:true entry when the same segment is fully re-appended', async () => {
    const sourceBuffer = makeSourceBuffer([[0, 10]]);
    const actor = createSourceBufferActor(sourceBuffer);

    // First: put a partial segment in context via initialContext shortcut
    const actorWithPartial = createSourceBufferActor(sourceBuffer, {
      segments: [{ id: 's1', startTime: 0, duration: 10, trackId: 'track-1', partial: true }],
    });

    // Now fully append the same segment (ArrayBuffer path — atomic, no partial)
    actorWithPartial.send({
      type: 'append-segment',
      data: new ArrayBuffer(8),
      meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
    });
    await vi.waitFor(() => expect(actorWithPartial.snapshot.get().value).toBe('idle'));

    const seg = actorWithPartial.snapshot.get().context.segments.find((s) => s.id === 's1');
    expect(seg).toBeDefined();
    expect(seg?.partial).toBeUndefined();

    actorWithPartial.destroy();
    actor.destroy();
  });

  it('destroy() transitions actor to destroyed and silently drops subsequent sends', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } });

    await vi.waitFor(() => expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1));

    actor.destroy();

    expect(actor.snapshot.get().value).toBe('destroyed');

    // After destroy, send() is silently dropped — state stays destroyed
    actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } });
    expect(actor.snapshot.get().value).toBe('destroyed');
  });
});
