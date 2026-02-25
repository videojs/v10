import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation } from '../../../core/types';
import {
  canUpdateDuration,
  type DurationUpdateOwners,
  type DurationUpdateState,
  shouldUpdateDuration,
  updateDuration,
} from '../update-duration';

function makeMediaSource(duration = 0) {
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
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canUpdateDuration(state, owners)).toBe(true);
  });

  it('returns false when mediaSource is missing', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const owners: DurationUpdateOwners = {};

    expect(canUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when presentation is missing', () => {
    const state: DurationUpdateState = {};
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when presentation.duration is undefined', () => {
    const state: DurationUpdateState = {
      presentation: {} as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canUpdateDuration(state, owners)).toBe(false);
  });
});

describe('shouldUpdateDuration', () => {
  it('returns true when all conditions met', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(true);
  });

  it('returns false when MediaSource is not open', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'closed', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when duration is NaN', () => {
    const state: DurationUpdateState = {
      presentation: { duration: NaN } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when duration is Infinity', () => {
    const state: DurationUpdateState = {
      presentation: { duration: Infinity } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when duration is 0', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 0 } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when duration is negative', () => {
    const state: DurationUpdateState = {
      presentation: { duration: -10 } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open', duration: 0 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(false);
  });

  it('returns false when duration matches current MediaSource.duration', () => {
    const state: DurationUpdateState = {
      presentation: { duration: 60 } as Presentation,
    };
    const owners: DurationUpdateOwners = {
      mediaSource: { readyState: 'open', duration: 60 } as MediaSource,
    };

    expect(shouldUpdateDuration(state, owners)).toBe(false);
  });
});

describe('updateDuration', () => {
  it('sets MediaSource.duration when conditions met', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});

    const cleanup = updateDuration({ state, owners });

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: 0, writable: true },
    });

    owners.patch({ mediaSource: mockMediaSource });
    state.patch({
      presentation: { duration: 60 } as Presentation,
    });

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('updates when presentation duration changes', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});

    const cleanup = updateDuration({ state, owners });

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: 0, writable: true },
    });

    owners.patch({ mediaSource: mockMediaSource });
    state.patch({
      presentation: { duration: 60 } as Presentation,
    });

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    // Update to new duration
    state.patch({
      presentation: { duration: 120 } as Presentation,
    });

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(120);
    });

    cleanup();
  });

  it('does not update when MediaSource is not open', () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});

    const cleanup = updateDuration({ state, owners });

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'closed', writable: true },
      duration: { value: 0, writable: true },
    });

    owners.patch({ mediaSource: mockMediaSource });
    state.patch({
      presentation: { duration: 60 } as Presentation,
    });

    expect(mockMediaSource.duration).toBe(0);

    cleanup();
  });

  it('does not update when duration is invalid', () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});

    const cleanup = updateDuration({ state, owners });

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: 0, writable: true },
    });

    owners.patch({ mediaSource: mockMediaSource });

    // Try NaN
    state.patch({
      presentation: { duration: NaN } as Presentation,
    });
    expect(mockMediaSource.duration).toBe(0);

    // Try Infinity
    state.patch({
      presentation: { duration: Infinity } as Presentation,
    });
    expect(mockMediaSource.duration).toBe(0);

    // Try negative
    state.patch({
      presentation: { duration: -10 } as Presentation,
    });
    expect(mockMediaSource.duration).toBe(0);

    cleanup();
  });

  it('extends duration to match buffered range if needed', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});

    const cleanup = updateDuration({ state, owners });

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
      duration: { value: 0, writable: true },
    });

    owners.patch({
      mediaSource: mockMediaSource,
      videoSourceBuffer: mockVideoBuffer,
    });

    // Presentation duration is 60, but buffered is 60.5
    state.patch({
      presentation: { duration: 60 } as Presentation,
    });

    await vi.waitFor(() => {
      // Duration should be extended to match buffered range
      expect(mockMediaSource.duration).toBe(60.5);
    });

    cleanup();
  });

  it('does not throw when videoSourceBuffer is updating at moment of set', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});
    const cleanup = updateDuration({ state, owners });

    const mockMediaSource = makeMediaSource();
    const { buffer: mockVideoBuffer, finishUpdating } = makeUpdatingSourceBuffer();

    owners.patch({ mediaSource: mockMediaSource, videoSourceBuffer: mockVideoBuffer });
    state.patch({ presentation: { duration: 60 } as Presentation });

    // Buffer finishes immediately after state change — must not throw
    finishUpdating();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('defers duration set until videoSourceBuffer finishes updating', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});
    const cleanup = updateDuration({ state, owners });

    const mockMediaSource = makeMediaSource();
    const { buffer: mockVideoBuffer, finishUpdating } = makeUpdatingSourceBuffer();

    owners.patch({ mediaSource: mockMediaSource, videoSourceBuffer: mockVideoBuffer });
    state.patch({ presentation: { duration: 60 } as Presentation });

    // Duration must not be set while buffer is still updating
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBe(0);

    // Buffer finishes — duration should now be set
    finishUpdating();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('defers until both video and audio SourceBuffers finish updating', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});
    const cleanup = updateDuration({ state, owners });

    const mockMediaSource = makeMediaSource();
    const { buffer: mockVideoBuffer, finishUpdating: finishVideo } = makeUpdatingSourceBuffer();
    const { buffer: mockAudioBuffer, finishUpdating: finishAudio } = makeUpdatingSourceBuffer();

    owners.patch({
      mediaSource: mockMediaSource,
      videoSourceBuffer: mockVideoBuffer,
      audioSourceBuffer: mockAudioBuffer,
    });
    state.patch({ presentation: { duration: 60 } as Presentation });

    // Neither buffer done — duration must not be set
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBe(0);

    // Only video done — audio still updating
    finishVideo();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockMediaSource.duration).toBe(0);

    // Audio done — now duration should be set
    finishAudio();

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    cleanup();
  });

  it('does not throw when readyState transitions to ended during the async wait', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});
    const cleanup = updateDuration({ state, owners });

    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: 0, writable: true },
    });

    // Attach an updating SourceBuffer so the task must await updateend
    const { buffer: mockVideoBuffer, finishUpdating } = makeUpdatingSourceBuffer();
    owners.patch({ mediaSource: mockMediaSource, videoSourceBuffer: mockVideoBuffer });
    state.patch({ presentation: { duration: 60 } as Presentation });

    // Simulate endOfStream() being called concurrently while the task is waiting —
    // transitions readyState to 'ended' before the task can set duration
    mockMediaSource.readyState = 'ended';
    finishUpdating();

    // Should resolve without throwing, and duration should NOT be set
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBe(0);

    cleanup();
  });

  it('handles multiple state updates correctly', async () => {
    const state = createState<DurationUpdateState>({});
    const owners = createState<DurationUpdateOwners>({});

    const cleanup = updateDuration({ state, owners });

    // Create mock with writable duration property
    const mockMediaSource = Object.create(MediaSource.prototype, {
      readyState: { value: 'open', writable: true },
      duration: { value: 0, writable: true },
    });

    // Set mediaSource first
    owners.patch({ mediaSource: mockMediaSource });
    expect(mockMediaSource.duration).toBe(0);

    // Then set presentation with duration
    state.patch({
      presentation: { duration: 60 } as Presentation,
    });

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(60);
    });

    // Update duration again
    state.patch({
      presentation: { duration: 90 } as Presentation,
    });

    await vi.waitFor(() => {
      expect(mockMediaSource.duration).toBe(90);
    });

    // Same duration should not trigger unnecessary set
    const previousDuration = mockMediaSource.duration;
    state.patch({
      presentation: { duration: 90 } as Presentation,
    });

    // Wait a bit to ensure no change occurs
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockMediaSource.duration).toBe(previousDuration);

    cleanup();
  });
});
