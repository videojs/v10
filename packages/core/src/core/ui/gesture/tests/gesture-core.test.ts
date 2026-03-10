import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import { GestureCore } from '../gesture-core';

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

describe('GestureCore', () => {
  describe('setProps', () => {
    it('uses default props', () => {
      const core = new GestureCore();
      expect(core.disabled).toBe(false);
    });

    it('accepts constructor props', () => {
      const core = new GestureCore({ disabled: true });
      expect(core.disabled).toBe(true);
    });

    it('updates via setProps', () => {
      const core = new GestureCore();
      core.setProps({ disabled: true });
      expect(core.disabled).toBe(true);
    });
  });

  describe('activate', () => {
    it('calls play when paused', async () => {
      const core = new GestureCore();
      const media = createMediaState({ paused: true });
      await core.activate(media);
      expect(media.play).toHaveBeenCalled();
    });

    it('calls pause when playing', async () => {
      const core = new GestureCore();
      const media = createMediaState({ paused: false });
      await core.activate(media);
      expect(media.pause).toHaveBeenCalled();
    });

    it('calls play when ended', async () => {
      const core = new GestureCore();
      const media = createMediaState({ ended: true });
      await core.activate(media);
      expect(media.play).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new GestureCore();
      core.setProps({ disabled: true });
      const media = createMediaState({ paused: true });
      await core.activate(media);
      expect(media.play).not.toHaveBeenCalled();
    });
  });
});
