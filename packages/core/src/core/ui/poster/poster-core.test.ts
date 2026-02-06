import { describe, expect, it, vi } from 'vitest';

import type { PlaybackState } from '../../media/state';
import { PosterCore } from './poster-core';

function createMockPlayback(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    ...overrides,
  };
}

describe('PosterCore', () => {
  describe('getState', () => {
    it('returns visible: true when playback has not started', () => {
      const core = new PosterCore();
      const playback = createMockPlayback({ started: false });

      const state = core.getState(playback);

      expect(state.visible).toBe(true);
    });

    it('returns visible: false when playback has started', () => {
      const core = new PosterCore();
      const playback = createMockPlayback({ started: true });

      const state = core.getState(playback);

      expect(state.visible).toBe(false);
    });

    it('returns only primitive values (no methods)', () => {
      const core = new PosterCore();
      const playback = createMockPlayback();

      const state = core.getState(playback);

      expect(state).toEqual({ visible: true });

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('visibility is independent of paused state', () => {
      const core = new PosterCore();

      // Started but paused - should not be visible
      expect(core.getState(createMockPlayback({ started: true, paused: true })).visible).toBe(false);

      // Started and playing - should not be visible
      expect(core.getState(createMockPlayback({ started: true, paused: false })).visible).toBe(false);

      // Not started and paused - should be visible
      expect(core.getState(createMockPlayback({ started: false, paused: true })).visible).toBe(true);
    });

    it('visibility is independent of ended state', () => {
      const core = new PosterCore();

      // Started and ended - should not be visible (started takes precedence)
      expect(core.getState(createMockPlayback({ started: true, ended: true })).visible).toBe(false);

      // Not started and ended (edge case) - should be visible
      expect(core.getState(createMockPlayback({ started: false, ended: true })).visible).toBe(true);
    });
  });
});
