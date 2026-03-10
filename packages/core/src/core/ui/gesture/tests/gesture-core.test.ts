import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import { ALLOWED_GESTURE_COMMANDS, ALLOWED_GESTURE_TYPES, GestureCore } from '../gesture-core';

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
  describe('defaultProps', () => {
    it('defaults type to first allowed type', () => {
      expect(GestureCore.defaultProps.type).toBe(ALLOWED_GESTURE_TYPES[0]);
    });

    it('defaults command to first allowed command', () => {
      expect(GestureCore.defaultProps.command).toBe(ALLOWED_GESTURE_COMMANDS[0]);
    });
  });

  describe('setProps', () => {
    it('accepts constructor props', () => {
      const core = new GestureCore({ type: 'pointerup', command: 'toggle-paused' });
      const media = createMediaState({ paused: true });
      core.activate(media);
      expect(media.play).toHaveBeenCalled();
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

    it('does nothing for an invalid type', async () => {
      const core = new GestureCore();
      core.setProps({ type: 'invalid' as any, command: 'toggle-paused' });
      const media = createMediaState({ paused: true });
      await core.activate(media);
      expect(media.play).not.toHaveBeenCalled();
      expect(media.pause).not.toHaveBeenCalled();
    });
  });
});
