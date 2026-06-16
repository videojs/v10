import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation } from '../../../../media/types';
import { updateMediaSourceDuration } from '../update-mediasource-duration';

function setupUpdateMediaSourceDuration() {
  const state = { presentation: signal<MaybeResolvedPresentation | undefined>(undefined) };
  const context = { mediaSource: signal<MediaSource | undefined>(undefined) };
  const reactor = updateMediaSourceDuration.setup({ state, context });
  return { state, context, reactor };
}

function makeMediaSource({
  duration = NaN,
  readyState = 'open',
  sourceBuffers = [],
}: {
  duration?: number;
  readyState?: MediaSource['readyState'];
  sourceBuffers?: SourceBuffer[];
} = {}) {
  // Back the mock with a real EventTarget so tests can dispatch
  // sourceopen / sourceended to drive `waitForMediaSourceOpen`.
  const target = new EventTarget();
  return Object.create(MediaSource.prototype, {
    readyState: { value: readyState, writable: true },
    duration: { value: duration, writable: true },
    sourceBuffers: { value: sourceBuffers as unknown as SourceBufferList, writable: false },
    addEventListener: { value: target.addEventListener.bind(target) },
    removeEventListener: { value: target.removeEventListener.bind(target) },
    dispatchEvent: { value: target.dispatchEvent.bind(target) },
  }) as MediaSource;
}

function transitionMediaSource(mediaSource: MediaSource, readyState: MediaSource['readyState'], eventType: string) {
  (mediaSource as MediaSource & { readyState: MediaSource['readyState'] }).readyState = readyState;
  mediaSource.dispatchEvent(new Event(eventType));
}

function makeUpdatingSourceBuffer() {
  const updateEndListeners: Array<() => void> = [];

  const buffer = {
    updating: true,
    buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
    addEventListener: (_event: string, handler: () => void, _options?: unknown) => {
      updateEndListeners.push(handler);
    },
    removeEventListener: vi.fn(),
  } as unknown as SourceBuffer;

  const finishUpdating = () => {
    (buffer as unknown as { updating: boolean }).updating = false;
    for (const h of updateEndListeners) h();
  };

  return { buffer, finishUpdating };
}

describe('updateMediaSourceDuration', () => {
  it('sets MediaSource.duration when conditions met', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource();
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    reactor.destroy();
  });

  it('does not update again after initial set even if presentation duration changes', async () => {
    // Once the MediaSource duration is set (no longer NaN), subsequent presentation
    // duration changes must not trigger another set — doing so races with appendBuffer().
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource();
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    // Simulate presentation.duration changing (e.g. recalculated) — must not re-fire
    state.presentation.set({ duration: 120 } as Presentation);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBe(60); // unchanged

    reactor.destroy();
  });

  it('waits for sourceopen before writing when MediaSource starts closed', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource({ readyState: 'closed' });
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    // Behavior is awaiting sourceopen — duration not yet written.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // MediaSource opens — write proceeds.
    transitionMediaSource(mockMediaSource, 'open', 'sourceopen');

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    reactor.destroy();
  });

  it('does not write if MediaSource transitions to ended before opening', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource({ readyState: 'closed' });
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    // Race: endOfStream lands before sourceopen — readyState jumps to 'ended'.
    transitionMediaSource(mockMediaSource, 'ended', 'sourceended');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBeNaN();

    reactor.destroy();
  });

  it('does not update when duration is invalid', () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource({ duration: 0 });

    context.mediaSource.set(mockMediaSource);

    // Try NaN
    state.presentation.set({ duration: NaN } as Presentation);
    expect(mockMediaSource.duration).toBe(0); // presentation validation guard fired

    // Try negative
    state.presentation.set({ duration: -10 } as Presentation);
    expect(mockMediaSource.duration).toBe(0);

    reactor.destroy();
  });

  it('writes Infinity to MediaSource.duration for live', async () => {
    // Per the MSE spec, `mediaSource.duration = Number.POSITIVE_INFINITY` is
    // the canonical live signal. The buffered-range clamp doesn't fire
    // (`anyEnd > Infinity` is always false), so Infinity passes through.
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource();
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: Number.POSITIVE_INFINITY } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(Number.POSITIVE_INFINITY);
    });

    reactor.destroy();
  });

  it('writes Infinity after sourceopen when the MediaSource starts closed (live)', async () => {
    // Regression: the live path used to write only if the MediaSource was
    // already open at entry, returning without scheduling a wait otherwise. The
    // presentation can resolve to Infinity before `setupMediaSource` opens the
    // MediaSource, so that eager write was missed — the first append then pinned
    // a finite live-edge duration, and appends stalled once the window slid past.
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource({ readyState: 'closed' });
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: Number.POSITIVE_INFINITY } as Presentation);

    // Awaiting sourceopen — nothing written yet.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // MediaSource opens — Infinity is written.
    transitionMediaSource(mockMediaSource, 'open', 'sourceopen');

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(Number.POSITIVE_INFINITY);
    });

    reactor.destroy();
  });

  it('writes Infinity for live only once a mid-append buffer goes idle', async () => {
    // Regression: a synchronous Infinity write that races an in-flight append
    // throws (MSE forbids setting duration while a buffer is updating) and was
    // swallowed, leaving the live stream pinned to a finite duration. The write
    // must defer to a non-updating instant.
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const { buffer: mockBuffer, finishUpdating } = makeUpdatingSourceBuffer();
    const mockMediaSource = makeMediaSource({ duration: 30, sourceBuffers: [mockBuffer] });
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: Number.POSITIVE_INFINITY } as Presentation);

    // Buffer still updating — must not have written yet (and must not throw).
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBe(30);

    // Append finishes — Infinity is written, overriding the finite value.
    finishUpdating();
    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(Number.POSITIVE_INFINITY);
    });

    reactor.destroy();
  });

  it('extends duration to match buffered range if needed', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockBuffered = {
      length: 1,
      start: () => 0,
      end: () => 60.5, // Buffered to 60.5 seconds
    };

    const mockBuffer = Object.create(SourceBuffer.prototype, {
      buffered: { value: mockBuffered, writable: false },
      updating: { value: false, writable: true },
    });

    const mockMediaSource = makeMediaSource({ sourceBuffers: [mockBuffer] });
    context.mediaSource.set(mockMediaSource);

    // Presentation duration is 60, but buffered is 60.5
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      // Duration should be extended to match buffered range
      expect(mockMediaSource.duration).toBe(60.5);
    });

    reactor.destroy();
  });

  it('does not throw when a buffer is updating at moment of set', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const { buffer: mockBuffer, finishUpdating } = makeUpdatingSourceBuffer();
    const mockMediaSource = makeMediaSource({ sourceBuffers: [mockBuffer] });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    // Buffer finishes immediately after state change — must not throw
    finishUpdating();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    reactor.destroy();
  });

  it('defers duration set until the attached buffer finishes updating', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const { buffer: mockBuffer, finishUpdating } = makeUpdatingSourceBuffer();
    const mockMediaSource = makeMediaSource({ sourceBuffers: [mockBuffer] });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    // Duration must not be set while buffer is still updating
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // Buffer finishes — duration should now be set
    finishUpdating();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    reactor.destroy();
  });

  it('defers until every attached SourceBuffer finishes updating', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const { buffer: mockA, finishUpdating: finishA } = makeUpdatingSourceBuffer();
    const { buffer: mockB, finishUpdating: finishB } = makeUpdatingSourceBuffer();
    const mockMediaSource = makeMediaSource({ sourceBuffers: [mockA, mockB] });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    // Neither buffer done — duration must not be set
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // Only first done — second still updating
    finishA();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // Second done — now duration should be set
    finishB();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    reactor.destroy();
  });

  it('composes against a single-buffer (audio-only) MediaSource', async () => {
    // Demonstrates the generic posture: the behavior wires only to mediaSource
    // and reads its sourceBuffers — audio-only and video-only configurations
    // compose it without per-type slot plumbing.
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockAudioBuffer = Object.create(SourceBuffer.prototype, {
      buffered: { value: { length: 0, start: () => 0, end: () => 0 } as TimeRanges, writable: false },
      updating: { value: false, writable: true },
    });
    const mockMediaSource = makeMediaSource({ sourceBuffers: [mockAudioBuffer] });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 45 } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(45);
    });

    reactor.destroy();
  });

  it('does not throw when readyState transitions to ended during the async wait', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    // Attach an updating SourceBuffer so the task must await updateend
    const { buffer: mockBuffer, finishUpdating } = makeUpdatingSourceBuffer();
    const mockMediaSource = makeMediaSource({ sourceBuffers: [mockBuffer] });
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    // Simulate endOfStream() being called concurrently while the task is waiting —
    // transitions readyState to 'ended' before the task can set duration
    (mockMediaSource as MediaSource & { readyState: MediaSource['readyState'] }).readyState = 'ended';
    finishUpdating();

    // Should resolve without throwing, and duration should NOT be set
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBeNaN();

    reactor.destroy();
  });

  it('sets duration once on initial NaN state then ignores further state changes', async () => {
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource();

    // MediaSource attached but no presentation yet — nothing happens
    context.mediaSource.set(mockMediaSource);
    expect(mockMediaSource.duration).toBeNaN();

    // Presentation with duration arrives — initial set fires
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    // Further state changes must not trigger another set
    state.presentation.set({ duration: 90 } as Presentation);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBe(60); // unchanged

    reactor.destroy();
  });

  it('writes Infinity for live even when an append already set a finite duration', async () => {
    // Live race: the first segment append sets duration to the buffered end
    // before this behavior writes. The once-while-NaN guard would leave it
    // finite; for Infinity we override (Infinity ≥ any buffered range).
    const { state, context, reactor } = setupUpdateMediaSourceDuration();

    const mockMediaSource = makeMediaSource({ duration: 30 });
    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: Number.POSITIVE_INFINITY } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(Number.POSITIVE_INFINITY);
    });

    reactor.destroy();
  });
});
