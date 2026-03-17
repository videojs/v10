import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../media/state';
import { PointerTypes } from '../gesture-core';
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
  describe('defaultProps', () => {
    it('defaults type to mouse', () => {
      expect(PlayGestureCore.defaultProps.type).toBe('mouse');
    });
  });

  describe('setProps', () => {
    it('updates the pointer type filter', () => {
      const core = new PlayGestureCore();
      core.setProps({ type: 'touch' });
      const media = createMediaState({ paused: true });
      core.setMedia(media);

      core.handleGesture({ pointerType: PointerTypes.TOUCH });
      expect(media.play).toHaveBeenCalled();
    });

    it('falls back to default type when not provided', () => {
      const core = new PlayGestureCore();
      core.setProps({});
      const media = createMediaState({ paused: true });
      core.setMedia(media);

      core.handleGesture({ pointerType: PointerTypes.MOUSE });
      expect(media.play).toHaveBeenCalled();
    });
  });

  describe('setMedia', () => {
    it('does nothing when no media has been set', () => {
      const core = new PlayGestureCore();
      expect(() => core.handleGesture({ pointerType: PointerTypes.MOUSE })).not.toThrow();
    });

    it('uses updated media after a second setMedia call', () => {
      const core = new PlayGestureCore();
      const media1 = createMediaState({ paused: true });
      const media2 = createMediaState({ paused: true });
      core.setMedia(media1);
      core.setMedia(media2);
      core.handleGesture({ pointerType: PointerTypes.MOUSE });
      expect(media1.play).not.toHaveBeenCalled();
      expect(media2.play).toHaveBeenCalled();
    });
  });

  describe('handleGesture', () => {
    it('calls play when paused', () => {
      const core = new PlayGestureCore();
      const media = createMediaState({ paused: true });
      core.setMedia(media);
      core.handleGesture({ pointerType: PointerTypes.MOUSE });
      expect(media.play).toHaveBeenCalled();
      expect(media.pause).not.toHaveBeenCalled();
    });

    it('calls pause when playing', () => {
      const core = new PlayGestureCore();
      const media = createMediaState({ paused: false });
      core.setMedia(media);
      core.handleGesture({ pointerType: PointerTypes.MOUSE });
      expect(media.pause).toHaveBeenCalled();
      expect(media.play).not.toHaveBeenCalled();
    });

    it('calls play when ended', () => {
      const core = new PlayGestureCore();
      const media = createMediaState({ paused: false, ended: true });
      core.setMedia(media);
      core.handleGesture({ pointerType: PointerTypes.MOUSE });
      expect(media.play).toHaveBeenCalled();
      expect(media.pause).not.toHaveBeenCalled();
    });

    describe('pointerType filtering', () => {
      it('ignores non-matching pointer types (default mouse)', () => {
        const core = new PlayGestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: PointerTypes.TOUCH });
        expect(media.play).not.toHaveBeenCalled();
      });

      it('ignores non-matching pointer types (configured touch)', () => {
        const core = new PlayGestureCore();
        core.setProps({ type: 'touch' });
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: PointerTypes.MOUSE });
        expect(media.play).not.toHaveBeenCalled();
      });

      it('does nothing for an empty pointerType', () => {
        const core = new PlayGestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: '' });
        expect(media.play).not.toHaveBeenCalled();
      });

      it('activates for matching pointer type', () => {
        const core = new PlayGestureCore();
        const media = createMediaState({ paused: true });
        core.setMedia(media);
        core.handleGesture({ pointerType: PointerTypes.MOUSE });
        expect(media.play).toHaveBeenCalled();
      });
    });
  });
});
