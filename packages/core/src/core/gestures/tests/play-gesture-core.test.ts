import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../media/state';
import { PlayGestureCore } from '../play-gesture-core';

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

describe('PlayGestureCore', () => {
  describe('setMedia', () => {
    it('does nothing when no media has been set', () => {
      const core = new PlayGestureCore();
      expect(() => core.handleGesture()).not.toThrow();
    });

    it('uses updated media after a second setMedia call', () => {
      const core = new PlayGestureCore();
      const media1 = createMediaState({ paused: true });
      const media2 = createMediaState({ paused: true });
      core.setMedia(media1);
      core.setMedia(media2);
      core.handleGesture();
      expect(media1.play).not.toHaveBeenCalled();
      expect(media2.play).toHaveBeenCalled();
    });
  });

  describe('handleGesture', () => {
    it('calls play when paused', () => {
      const core = new PlayGestureCore();
      const media = createMediaState({ paused: true });
      core.setMedia(media);
      core.handleGesture();
      expect(media.play).toHaveBeenCalled();
      expect(media.pause).not.toHaveBeenCalled();
    });

    it('calls pause when playing', () => {
      const core = new PlayGestureCore();
      const media = createMediaState({ paused: false });
      core.setMedia(media);
      core.handleGesture();
      expect(media.pause).toHaveBeenCalled();
      expect(media.play).not.toHaveBeenCalled();
    });

    it('calls play when ended', () => {
      const core = new PlayGestureCore();
      const media = createMediaState({ paused: false, ended: true });
      core.setMedia(media);
      core.handleGesture();
      expect(media.play).toHaveBeenCalled();
      expect(media.pause).not.toHaveBeenCalled();
    });
  });
});
