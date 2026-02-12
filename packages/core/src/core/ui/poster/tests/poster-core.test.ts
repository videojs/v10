import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import { PosterCore } from '../poster-core';

function createMediaState(overrides: Partial<MediaPlaybackState> = {}): MediaPlaybackState {
  return {
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    ...overrides,
  };
}

describe('PosterCore', () => {
  describe('getState', () => {
    it('returns visible: true when playback has not started', () => {
      const core = new PosterCore();
      const media = createMediaState({ started: false });

      const state = core.getState(media);

      expect(state.visible).toBe(true);
    });

    it('returns visible: false when playback has started', () => {
      const core = new PosterCore();
      const media = createMediaState({ started: true });

      const state = core.getState(media);

      expect(state.visible).toBe(false);
    });

    it('returns only primitive values (no methods)', () => {
      const core = new PosterCore();
      const media = createMediaState();

      const state = core.getState(media);

      expect(state).toEqual({ visible: true });

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('visibility is independent of paused state', () => {
      const core = new PosterCore();

      // Started but paused - should not be visible
      expect(core.getState(createMediaState({ started: true, paused: true })).visible).toBe(false);

      // Started and playing - should not be visible
      expect(core.getState(createMediaState({ started: true, paused: false })).visible).toBe(false);

      // Not started and paused - should be visible
      expect(core.getState(createMediaState({ started: false, paused: true })).visible).toBe(true);
    });

    it('visibility is independent of ended state', () => {
      const core = new PosterCore();

      // Started and ended - should not be visible (started takes precedence)
      expect(core.getState(createMediaState({ started: true, ended: true })).visible).toBe(false);

      // Not started and ended (edge case) - should be visible
      expect(core.getState(createMediaState({ started: false, ended: true })).visible).toBe(true);
    });
  });
});
