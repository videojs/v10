import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import { BufferingIndicatorCore } from '../buffering-indicator-core';

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

describe('BufferingIndicatorCore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getState', () => {
    it('returns visible: false when not waiting', () => {
      const core = new BufferingIndicatorCore();
      const media = createMediaState({ waiting: false, paused: false });

      expect(core.getState(media)).toEqual({ visible: false });
    });

    it('returns visible: false when waiting but paused', () => {
      const core = new BufferingIndicatorCore();
      const media = createMediaState({ waiting: true, paused: true });

      expect(core.getState(media)).toEqual({ visible: false });
    });

    it('returns visible: false immediately when waiting and not paused (before delay)', () => {
      const core = new BufferingIndicatorCore();
      const media = createMediaState({ waiting: true, paused: false });

      expect(core.getState(media)).toEqual({ visible: false });
    });

    it('returns visible: true after default delay elapses', () => {
      const core = new BufferingIndicatorCore();
      const media = createMediaState({ waiting: true, paused: false });

      core.getState(media);
      vi.advanceTimersByTime(500);

      expect(core.getState(media)).toEqual({ visible: true });
    });

    it('returns visible: false if waiting ends before delay', () => {
      const core = new BufferingIndicatorCore();

      core.getState(createMediaState({ waiting: true, paused: false }));
      vi.advanceTimersByTime(300);

      // Waiting ends
      const state = core.getState(createMediaState({ waiting: false, paused: false }));

      expect(state).toEqual({ visible: false });

      // Even after more time, still not visible
      vi.advanceTimersByTime(500);
      expect(core.getState(createMediaState({ waiting: false, paused: false }))).toEqual({ visible: false });
    });

    it('resets timer when waiting toggles off and on within delay', () => {
      const core = new BufferingIndicatorCore();
      const waiting = createMediaState({ waiting: true, paused: false });
      const notWaiting = createMediaState({ waiting: false, paused: false });

      // Start waiting
      core.getState(waiting);
      vi.advanceTimersByTime(300);

      // Stop waiting (cancels timer)
      core.getState(notWaiting);

      // Start waiting again (new timer)
      core.getState(waiting);
      vi.advanceTimersByTime(300);

      // Only 300ms into the new timer, not yet visible
      expect(core.getState(waiting)).toEqual({ visible: false });

      // Full 500ms from second start
      vi.advanceTimersByTime(200);
      expect(core.getState(waiting)).toEqual({ visible: true });
    });

    it('immediately hides when waiting ends while visible', () => {
      const core = new BufferingIndicatorCore();
      const waiting = createMediaState({ waiting: true, paused: false });

      core.getState(waiting);
      vi.advanceTimersByTime(500);
      expect(core.getState(waiting)).toEqual({ visible: true });

      // Stop waiting
      expect(core.getState(createMediaState({ waiting: false, paused: false }))).toEqual({ visible: false });
    });

    it('immediately hides when paused while visible', () => {
      const core = new BufferingIndicatorCore();

      core.getState(createMediaState({ waiting: true, paused: false }));
      vi.advanceTimersByTime(500);
      expect(core.getState(createMediaState({ waiting: true, paused: false }))).toEqual({ visible: true });

      // Pause
      expect(core.getState(createMediaState({ waiting: true, paused: true }))).toEqual({ visible: false });
    });

    it('returns only primitive values', () => {
      const core = new BufferingIndicatorCore();
      const state = core.getState(createMediaState());

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });
  });

  describe('custom delay', () => {
    it('respects a custom delay value', () => {
      const core = new BufferingIndicatorCore();
      core.setProps({ delay: 1000 });
      const media = createMediaState({ waiting: true, paused: false });

      core.getState(media);
      vi.advanceTimersByTime(500);
      expect(core.getState(media)).toEqual({ visible: false });

      vi.advanceTimersByTime(500);
      expect(core.getState(media)).toEqual({ visible: true });
    });

    it('respects delay: 0 for immediate visibility', () => {
      const core = new BufferingIndicatorCore();
      core.setProps({ delay: 0 });
      const media = createMediaState({ waiting: true, paused: false });

      core.getState(media);
      vi.advanceTimersByTime(0);

      expect(core.getState(media)).toEqual({ visible: true });
    });
  });

  describe('onChange callback', () => {
    it('calls onChange when delay elapses', () => {
      const onChange = vi.fn();
      const core = new BufferingIndicatorCore(onChange);
      const media = createMediaState({ waiting: true, paused: false });

      core.getState(media);
      expect(onChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(onChange).toHaveBeenCalledOnce();
    });

    it('does not call onChange if waiting ends before delay', () => {
      const onChange = vi.fn();
      const core = new BufferingIndicatorCore(onChange);

      core.getState(createMediaState({ waiting: true, paused: false }));
      vi.advanceTimersByTime(300);
      core.getState(createMediaState({ waiting: false, paused: false }));
      vi.advanceTimersByTime(500);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('clears pending timer', () => {
      const onChange = vi.fn();
      const core = new BufferingIndicatorCore(onChange);

      core.getState(createMediaState({ waiting: true, paused: false }));
      core.destroy();

      vi.advanceTimersByTime(500);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('resets visible to false', () => {
      const core = new BufferingIndicatorCore();
      const media = createMediaState({ waiting: true, paused: false });

      core.getState(media);
      vi.advanceTimersByTime(500);
      expect(core.getState(media)).toEqual({ visible: true });

      core.destroy();
      expect(core.getState(createMediaState({ waiting: false }))).toEqual({ visible: false });
    });
  });
});
