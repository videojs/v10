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
