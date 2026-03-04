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

      core.setMedia(media);
      const state = core.getState();

      expect(state.visible).toBe(true);
    });

    it('returns visible: false when playback has started', () => {
      const core = new PosterCore();
      const media = createMediaState({ started: true });

      core.setMedia(media);
      const state = core.getState();

      expect(state.visible).toBe(false);
    });

    it('returns only primitive values (no methods)', () => {
      const core = new PosterCore();
      const media = createMediaState();

      core.setMedia(media);
      const state = core.getState();

      expect(state).toEqual({ visible: true });

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('visibility is independent of paused state', () => {
      const core = new PosterCore();

      // Started but paused - should not be visible
      core.setMedia(createMediaState({ started: true, paused: true }));
      expect(core.getState().visible).toBe(false);

      // Started and playing - should not be visible
      core.setMedia(createMediaState({ started: true, paused: false }));
      expect(core.getState().visible).toBe(false);

      // Not started and paused - should be visible
      core.setMedia(createMediaState({ started: false, paused: true }));
      expect(core.getState().visible).toBe(true);
    });

    it('visibility is independent of ended state', () => {
      const core = new PosterCore();

      // Started and ended - should not be visible (started takes precedence)
      core.setMedia(createMediaState({ started: true, ended: true }));
      expect(core.getState().visible).toBe(false);

      // Not started and ended (edge case) - should be visible
      core.setMedia(createMediaState({ started: false, ended: true }));
      expect(core.getState().visible).toBe(true);
    });
  });
});
