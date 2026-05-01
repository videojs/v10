import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { Presentation } from '../../../../media/types';
import {
  canUpdateDuration,
  type DurationUpdateContext,
  type DurationUpdateState,
  shouldUpdateDuration,
  updateDuration,
} from '../update-duration';

function makeState(initial: DurationUpdateState = {}): StateSignals<DurationUpdateState> {
  return {
    presentation: signal<Presentation | undefined>(initial.presentation),
    mediaSourceReadyState: signal<MediaSource['readyState'] | undefined>(initial.mediaSourceReadyState),
  };
}

function makeContext(initial: DurationUpdateContext = {}): ContextSignals<DurationUpdateContext> {
  return {
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
    videoBuffer: signal<SourceBuffer | undefined>(initial.videoBuffer),
    audioBuffer: signal<SourceBuffer | undefined>(initial.audioBuffer),
  };
}

function setupUpdateDuration(initialState: DurationUpdateState, initialContext: DurationUpdateContext) {
  // Default mediaSourceReadyState to 'open' to mirror what setupMediaSource
  // would have written. Tests that exercise other readyState values pass it
  // explicitly.
  const state = makeState({ mediaSourceReadyState: 'open', ...initialState });
  const context = makeContext(initialContext);
  const cleanup = updateDuration({ state, context });
  return { state, context, cleanup };
}

function makeMediaSource(duration = NaN) {
  return Object.create(MediaSource.prototype, {
    readyState: { value: 'open', writable: true },
    duration: { value: duration, writable: true },
  }) as MediaSource;
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

describe('canUpdateDuration', () => {
  it('returns true when mediaSource exists and presentation has duration', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canUpdateDuration(state, context)).toBe(true);
  });

  it('returns false when mediaSource is missing', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const context: DurationUpdateContext = {};

    expect(canUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when presentation is missing', () => {
    const state: DurationUpdateState = {};
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when presentation.duration is undefined', () => {
    const state: DurationUpdateState = {
      presentation: {} as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canUpdateDuration(state, context)).toBe(false);
  });
});

describe('shouldUpdateDuration', () => {
  it('returns true when MediaSource duration is NaN (initial state)', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
      mediaSourceReadyState: 'open',
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: NaN } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(true);
  });

  it('returns false when MediaSource is not open', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
      mediaSourceReadyState: 'closed',
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'closed', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when duration is NaN', () => {
    const state: DurationUpdateState = {
      presentation: { duration: NaN } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when duration is Infinity', () => {
    const state: DurationUpdateState = {
      presentation: { duration: Infinity } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when duration is 0', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 0 } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when duration is negative', () => {
    const state: DurationUpdateState = {
      presentation: { duration: -10 } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when MediaSource duration is already set (non-NaN) even if different from presentation', () => {
    // This is the TOCTOU scenario: endOfStream() set mediaSource.duration to the
    // actual buffered end (25.28), leaving a small drift from playlist duration (25.317).
    // shouldUpdateDuration must NOT re-fire in this case — doing so races with appendBuffer().
    const state: DurationUpdateState = {
      presentation: { duration: 25.317 } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: 25.28 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });

  it('returns false when duration matches current MediaSource.duration', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const context: DurationUpdateContext = {
      mediaSource: { readyState: 'open', duration: 60 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, context)).toBe(false);
  });
});

describe('updateDuration', () => {
  it('sets MediaSource.duration when conditions met', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    // NaN is the real initial state of a freshly opened MediaSource
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: NaN, writable: true },
    });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('does not update again after initial set even if presentation duration changes', async () => {
    // Once the MediaSource duration is set (no longer NaN), subsequent presentation
    // duration changes must not trigger another set — doing so races with appendBuffer().
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: NaN, writable: true },
    });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    // Simulate presentation.duration changing (e.g. recalculated) — must not re-fire
    state.presentation.set({ duration: 120 } as Presentation);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBe(60); // unchanged

    cleanup();
  });

  it('does not update when MediaSource is not open', () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'closed', writable: true },
      duration: { value: 0, writable: true },
    });

    context.mediaSource.set(mockMediaSource);
    state.presentation.set({ duration: 60 } as Presentation);

    expect(mockMediaSource.duration).toBe(0); // unchanged — readyState guard fired first

    cleanup();
  });

  it('does not update when duration is invalid', () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: 0, writable: true },
    });

    context.mediaSource.set(mockMediaSource);

    // Try NaN
    state.presentation.set({ duration: NaN } as Presentation);
    expect(mockMediaSource.duration).toBe(0); // presentation validation guard fired

    // Try Infinity
    state.presentation.set({ duration: Infinity } as Presentation);
    expect(mockMediaSource.duration).toBe(0);

    // Try negative
    state.presentation.set({ duration: -10 } as Presentation);
    expect(mockMediaSource.duration).toBe(0);

    cleanup();
  });

  it('extends duration to match buffered range if needed', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    // Create mock SourceBuffer with buffered data that exceeds presentation duration
    const mockBuffered = {
      length: 1,
      start: () => 0,
      end: () => 60.5, // Buffered to 60.5 seconds
    };

    const mockVideoBuffer = Object.create(SourceBuffer.prototype, {
      buffered: { value: mockBuffered, writable: false },
      updating: { value: false, writable: true },
    });

    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: NaN, writable: true },
    });

    context.mediaSource.set(mockMediaSource);
    context.videoBuffer.set(mockVideoBuffer);

    // Presentation duration is 60, but buffered is 60.5
    state.presentation.set({ duration: 60 } as Presentation);

    await vi.waitFor(() => {
      // Duration should be extended to match buffered range
      expect(mockMediaSource.duration).toBe(60.5);
    });

    cleanup();
  });

  it('does not throw when videoBuffer is updating at moment of set', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    const mockMediaSource = makeMediaSource();
    const { buffer: mockVideoBuffer, finishUpdating } = makeUpdatingSourceBuffer();

    context.mediaSource.set(mockMediaSource);
    context.videoBuffer.set(mockVideoBuffer);
    state.presentation.set({ duration: 60 } as Presentation);

    // Buffer finishes immediately after state change — must not throw
    finishUpdating();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('defers duration set until videoBuffer finishes updating', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    const mockMediaSource = makeMediaSource();
    const { buffer: mockVideoBuffer, finishUpdating } = makeUpdatingSourceBuffer();

    context.mediaSource.set(mockMediaSource);
    context.videoBuffer.set(mockVideoBuffer);
    state.presentation.set({ duration: 60 } as Presentation);

    // Duration must not be set while buffer is still updating
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // Buffer finishes — duration should now be set
    finishUpdating();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('defers until both video and audio SourceBuffers finish updating', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    const mockMediaSource = makeMediaSource();
    const { buffer: mockVideoBuffer, finishUpdating: finishVideo } = makeUpdatingSourceBuffer();
    const { buffer: mockAudioBuffer, finishUpdating: finishAudio } = makeUpdatingSourceBuffer();

    context.mediaSource.set(mockMediaSource);
    context.videoBuffer.set(mockVideoBuffer);
    context.audioBuffer.set(mockAudioBuffer);
    state.presentation.set({ duration: 60 } as Presentation);

    // Neither buffer done — duration must not be set
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // Only video done — audio still updating
    finishVideo();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBeNaN();

    // Audio done — now duration should be set
    finishAudio();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('does not throw when readyState transitions to ended during the async wait', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: NaN, writable: true },
    });

    // Attach an updating SourceBuffer so the task must await updateend
    const { buffer: mockVideoBuffer, finishUpdating } = makeUpdatingSourceBuffer();
    context.mediaSource.set(mockMediaSource);
    context.videoBuffer.set(mockVideoBuffer);
    state.presentation.set({ duration: 60 } as Presentation);

    // Simulate endOfStream() being called concurrently while the task is waiting —
    // transitions readyState to 'ended' before the task can set duration
    mockMediaSource.readyState = 'ended';
    finishUpdating();

    // Should resolve without throwing, and duration should NOT be set
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBeNaN();

    cleanup();
  });

  it('sets duration once on initial NaN state then ignores further state changes', async () => {
    const { state, context, cleanup } = setupUpdateDuration({}, {});

    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: NaN, writable: true },
    });

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

    cleanup();
  });
});
