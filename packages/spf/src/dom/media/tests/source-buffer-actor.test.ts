import { describe, expect, it, vi } from 'vitest';
import { createSourceBufferActor, SourceBufferActorError } from '../source-buffer-actor';

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

const neverAborted = new AbortController().signal;

describe('createSourceBufferActor', () => {
  // ---------------------------------------------------------------------------
  // State guard — messages rejected when not idle
  // ---------------------------------------------------------------------------

  it('rejects send() with SourceBufferActorError when actor is updating', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // status transitions to 'updating' synchronously when send() is called,
    // so the second send() in the same tick sees 'updating' and rejects.
    const p1 = actor.send(
      { type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
      neverAborted
    );

    await expect(
      actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } }, neverAborted)
    ).rejects.toBeInstanceOf(SourceBufferActorError);

    await p1;
    actor.destroy();
  });

  it('rejects batch() with SourceBufferActorError when actor is updating', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const p1 = actor.send(
      { type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
      neverAborted
    );

    await expect(
      actor.batch([{ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } }], neverAborted)
    ).rejects.toBeInstanceOf(SourceBufferActorError);

    await p1;
    actor.destroy();
  });

  it('accepts send() again once idle', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    await actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } }, neverAborted);

    expect(actor.snapshot.status).toBe('idle');

    await actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } }, neverAborted);

    expect(actor.snapshot.context.initTrackId).toBe('track-2');
    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Batch — individual tasks, context threading
  // ---------------------------------------------------------------------------

  it('batch executes all messages in order as individual tasks', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const messages = [
      { type: 'append-init' as const, data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
      {
        type: 'append-segment' as const,
        data: new ArrayBuffer(8),
        meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
      },
    ];

    await actor.batch(messages, neverAborted);

    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(2);
    expect(actor.snapshot.context.initTrackId).toBe('track-1');
    expect(actor.snapshot.context.segments).toHaveLength(1);

    actor.destroy();
  });

  it('batch threads context between tasks so overlap detection works', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // Two segments at the same time range — the second should replace the first
    await actor.batch(
      [
        {
          type: 'append-segment' as const,
          data: new ArrayBuffer(8),
          meta: { id: 's1-low', startTime: 0, duration: 10, trackId: 'track-low' },
        },
        {
          type: 'append-segment' as const,
          data: new ArrayBuffer(8),
          meta: { id: 's1-high', startTime: 0, duration: 10, trackId: 'track-high' },
        },
      ],
      neverAborted
    );

    const ids = actor.snapshot.context.segments.map((s) => s.id);
    expect(ids).not.toContain('s1-low');
    expect(ids).toContain('s1-high');
    expect(actor.snapshot.context.segments).toHaveLength(1);

    actor.destroy();
  });

  it('batch status stays idle until after last task completes', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const statusValues: string[] = [];
    const unsub = actor.subscribe((s) => statusValues.push(s.status));

    await actor.batch(
      [
        { type: 'append-init' as const, data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
        {
          type: 'append-segment' as const,
          data: new ArrayBuffer(8),
          meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
        },
      ],
      neverAborted
    );

    unsub();

    // Initial idle (immediate subscribe fire) → updating → idle
    // No intermediate context-update-while-updating snapshots
    expect(statusValues).toContain('updating');
    expect(statusValues[statusValues.length - 1]).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Abort: before start
  // ---------------------------------------------------------------------------

  it('skips message when signal is aborted before execution starts', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const abortedController = new AbortController();
    abortedController.abort();

    await actor.send(
      { type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
      abortedController.signal
    );

    expect(sourceBuffer.appendBuffer).not.toHaveBeenCalled();

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Abort: during batch execution
  // ---------------------------------------------------------------------------

  it('batch: aborts mid-flight; subsequent messages in batch are skipped', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const controller = new AbortController();

    const messages = [
      { type: 'append-init' as const, data: new ArrayBuffer(4), meta: { trackId: 'track-1' } },
      {
        type: 'append-segment' as const,
        data: new ArrayBuffer(8),
        meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
      },
    ];

    const origAppend = (sourceBuffer.appendBuffer as ReturnType<typeof vi.fn>).getMockImplementation();
    let firstCall = true;
    (sourceBuffer.appendBuffer as ReturnType<typeof vi.fn>).mockImplementation((...args: unknown[]) => {
      if (firstCall) {
        firstCall = false;
        controller.abort();
      }
      return origAppend?.(...args);
    });

    await actor.batch(messages, controller.signal);

    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1);

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // append-init
  // ---------------------------------------------------------------------------

  it('sets initTrackId in context and transitions back to idle after append-init', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    await actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } }, neverAborted);

    expect(actor.snapshot.context.initTrackId).toBe('track-1');
    expect(actor.snapshot.status).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // append-segment
  // ---------------------------------------------------------------------------

  it('adds entry to context.segments and transitions back to idle after append-segment', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    await actor.send(
      {
        type: 'append-segment',
        data: new ArrayBuffer(8),
        meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
      },
      neverAborted
    );

    expect(actor.snapshot.context.segments).toHaveLength(1);
    expect(actor.snapshot.context.segments[0]).toMatchObject({
      id: 's1',
      startTime: 0,
      duration: 10,
      trackId: 'track-1',
    });
    expect(actor.snapshot.status).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // append-segment: quality replacement
  // ---------------------------------------------------------------------------

  it('removes overlapping segment from context on quality replacement', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    await actor.send(
      {
        type: 'append-segment',
        data: new ArrayBuffer(8),
        meta: { id: 's1-low', startTime: 0, duration: 10, trackId: 'track-low' },
      },
      neverAborted
    );

    await actor.send(
      {
        type: 'append-segment',
        data: new ArrayBuffer(8),
        meta: { id: 's1-high', startTime: 0, duration: 10, trackId: 'track-high' },
      },
      neverAborted
    );

    const ids = actor.snapshot.context.segments.map((s) => s.id);
    expect(ids).not.toContain('s1-low');
    expect(ids).toContain('s1-high');
    expect(actor.snapshot.context.segments).toHaveLength(1);

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

    await actor.batch(
      [
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
      neverAborted
    );

    // Remove at a segment boundary so midpoints cleanly fall inside or outside.
    await actor.send({ type: 'remove', start: 0, end: 20 }, neverAborted);

    expect(sourceBuffer.remove).toHaveBeenCalledWith(0, 20);
    const ids = actor.snapshot.context.segments.map((s) => s.id);
    expect(ids).not.toContain('s1');
    expect(ids).not.toContain('s2');
    expect(ids).toContain('s3');
    expect(actor.snapshot.status).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Status transitions
  // ---------------------------------------------------------------------------

  it('transitions to "updating" during send and back to "idle" after', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const statusValues: string[] = [];
    const unsub = actor.subscribe((snapshot) => statusValues.push(snapshot.status));

    await actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } }, neverAborted);

    unsub();

    // Initial 'idle' (from immediate subscribe fire) → 'updating' → 'idle'
    expect(statusValues).toContain('updating');
    expect(statusValues[statusValues.length - 1]).toBe('idle');

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // subscribe
  // ---------------------------------------------------------------------------

  it('fires subscriber immediately with current snapshot', () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const snapshots: unknown[] = [];
    const unsub = actor.subscribe((s) => snapshots.push(s));

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ status: 'idle', context: { segments: [], bufferedRanges: [] } });

    unsub();
    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // destroy()
  // ---------------------------------------------------------------------------

  it('destroy() aborts the in-progress operation', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const origAppend = (sourceBuffer.appendBuffer as ReturnType<typeof vi.fn>).getMockImplementation();
    (sourceBuffer.appendBuffer as ReturnType<typeof vi.fn>).mockImplementationOnce((...args: unknown[]) => {
      return origAppend?.(...args);
    });

    const p = actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } }, neverAborted);

    await vi.waitFor(() => expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1));

    actor.destroy();

    // Operation was in-flight — let it complete naturally
    await p;

    // After destroy, send() is rejected
    await expect(
      actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } }, neverAborted)
    ).rejects.toBeInstanceOf(SourceBufferActorError);
  });
});
