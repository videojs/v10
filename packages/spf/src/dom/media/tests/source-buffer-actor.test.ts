import { describe, expect, it, vi } from 'vitest';
import { createSourceBufferActor } from '../source-buffer-actor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSourceBuffer(): SourceBuffer {
  const listeners: Record<string, EventListener[]> = {};

  return {
    buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
    updating: false,
    appendBuffer: vi.fn(() => {
      setTimeout(() => {
        for (const listener of listeners.updateend ?? []) {
          listener(new Event('updateend'));
        }
      }, 0);
    }),
    remove: vi.fn(() => {
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

// ---------------------------------------------------------------------------
// Queue sequencing
// ---------------------------------------------------------------------------

describe('createSourceBufferActor', () => {
  it('executes two send() calls in order, not concurrently', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    const order: number[] = [];

    const p1 = actor
      .send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } }, neverAborted)
      .then(() => {
        order.push(1);
      });

    const p2 = actor
      .send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-2' } }, neverAborted)
      .then(() => {
        order.push(2);
      });

    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(2);

    actor.destroy();
  });

  // ---------------------------------------------------------------------------
  // Batch sequencing
  // ---------------------------------------------------------------------------

  it('executes batch messages in order and resolves single promise at end', async () => {
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
  // Abort: during execution
  // ---------------------------------------------------------------------------

  it('completes in-flight operation; subsequent messages in same batch are skipped', async () => {
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

    // Abort when the first append fires — second message should be skipped
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

    // Establish a low-quality segment
    await actor.send(
      {
        type: 'append-segment',
        data: new ArrayBuffer(8),
        meta: { id: 's1-low', startTime: 0, duration: 10, trackId: 'track-low' },
      },
      neverAborted
    );

    // Quality switch: same time range, different track
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

  it('removes overlapping segments from context and transitions back to idle', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // Populate context via operations
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

    await actor.send({ type: 'remove', start: 0, end: 15 }, neverAborted);

    expect(sourceBuffer.remove).toHaveBeenCalledWith(0, 15);
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

  it('transitions to "updating" during operation and back to "idle" after', async () => {
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

  it('queued messages do not execute after destroy', async () => {
    const sourceBuffer = makeSourceBuffer();
    const actor = createSourceBufferActor(sourceBuffer);

    // Queue two messages. The first starts immediately (in-flight), the second
    // is queued and must not execute once destroy() is called.
    const p = actor.send({ type: 'append-init', data: new ArrayBuffer(4), meta: { trackId: 'track-1' } }, neverAborted);

    const p2 = actor.send(
      {
        type: 'append-segment',
        data: new ArrayBuffer(8),
        meta: { id: 's1', startTime: 0, duration: 10, trackId: 'track-1' },
      },
      neverAborted
    );

    // Destroy before the second message can start. The first is already in-flight
    // (appendBuffer was called synchronously when drain started).
    actor.destroy();

    await Promise.all([p, p2]);

    // First message was already in-flight (1 appendBuffer call).
    // Second message was in queue and must not have run.
    expect(sourceBuffer.appendBuffer).toHaveBeenCalledTimes(1);
  });
});
