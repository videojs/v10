import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import { ALLOWED_GESTURE_COMMANDS, ALLOWED_GESTURE_TYPES, GestureCore, PointerTypes } from '../gesture-core';

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

function createMouseGesture(): { pointerType: string } {
  return { pointerType: PointerTypes.MOUSE };
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
    it('updates props used during handleGesture', () => {
      const core = new GestureCore();
      core.setProps({ type: 'pointerup', command: 'toggle-paused' });
      const media = createMediaState({ paused: true });
      core.setMedia(media);
      core.handleGesture(createMouseGesture());
      expect(media.play).toHaveBeenCalled();
    });

    it('falls back to defaults for missing props', () => {
      const core = new GestureCore();
      core.setProps({ type: 'pointerup', command: 'toggle-paused' });
      const media = createMediaState({ paused: false });
      core.setMedia(media);
      core.handleGesture(createMouseGesture());
      expect(media.pause).toHaveBeenCalled();
    });
  });

  describe('setMedia', () => {
    it('does nothing when no media has been set', () => {
      const core = new GestureCore();
      expect(() => core.handleGesture(createMouseGesture())).not.toThrow();
    });

    it('uses the media set via setMedia', () => {
      const core = new GestureCore();
      const media = createMediaState({ paused: true });
      core.setMedia(media);
      core.handleGesture(createMouseGesture());
      expect(media.play).toHaveBeenCalled();
    });

    it('uses updated media after a second setMedia call', () => {
      const core = new GestureCore();
      const media1 = createMediaState({ paused: true });
      const media2 = createMediaState({ paused: true });
      core.setMedia(media1);
      core.setMedia(media2);
      core.handleGesture(createMouseGesture());
      expect(media1.play).not.toHaveBeenCalled();
      expect(media2.play).toHaveBeenCalled();
    });
  });

  describe('handleGesture', () => {
    describe('toggle-paused', () => {
      it('calls play when paused', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture(createMouseGesture());
        expect(media.play).toHaveBeenCalled();
        expect(media.pause).not.toHaveBeenCalled();
      });

      it('calls pause when playing', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: false });
        core.setMedia(media);
        core.handleGesture(createMouseGesture());
        expect(media.pause).toHaveBeenCalled();
        expect(media.play).not.toHaveBeenCalled();
      });

      it('calls play when ended', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: false, ended: true });
        core.setMedia(media);
        core.handleGesture(createMouseGesture());
        expect(media.play).toHaveBeenCalled();
        expect(media.pause).not.toHaveBeenCalled();
      });
    });

    describe('pointerType filtering', () => {
      it('does nothing for touch pointer type', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: PointerTypes.TOUCH });
        expect(media.play).not.toHaveBeenCalled();
        expect(media.pause).not.toHaveBeenCalled();
      });

      it('does nothing for pen pointer type', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: PointerTypes.PEN });
        expect(media.play).not.toHaveBeenCalled();
        expect(media.pause).not.toHaveBeenCalled();
      });

      it('does nothing for an empty pointerType', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: '' });
        expect(media.play).not.toHaveBeenCalled();
        expect(media.pause).not.toHaveBeenCalled();
      });

      it('activates for mouse pointer type', () => {
        const core = new GestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: PointerTypes.MOUSE });
        expect(media.play).toHaveBeenCalled();
      });
    });

    describe('invalid type', () => {
      it('does nothing for an invalid gesture type', () => {
        const core = new GestureCore();
        core.setProps({ type: 'invalid' as any, command: 'toggle-paused' });
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture(createMouseGesture());
        expect(media.play).not.toHaveBeenCalled();
        expect(media.pause).not.toHaveBeenCalled();
      });
    });
  });
});
