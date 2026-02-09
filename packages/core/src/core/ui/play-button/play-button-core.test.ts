import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../media/state';
import { PlayButtonCore } from './play-button-core';

function createMockPlayback(overrides: Partial<MediaPlaybackState> = {}): MediaPlaybackState {
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

describe('PlayButtonCore', () => {
  describe('getLabel', () => {
    it('returns custom label string when provided', () => {
      const core = new PlayButtonCore({ label: 'Custom Label' });
      const playback = createMockPlayback();

      expect(core.getLabel(playback)).toBe('Custom Label');
    });

    it('returns custom label from function when provided', () => {
      const core = new PlayButtonCore({
        label: (state) => (state.paused ? 'Start' : 'Stop'),
      });
      const playback = createMockPlayback({ paused: true });

      expect(core.getLabel(playback)).toBe('Start');
    });

    it('falls back to default label when function returns empty string', () => {
      const core = new PlayButtonCore({ label: () => '' });
      const playback = createMockPlayback({ paused: true });

      expect(core.getLabel(playback)).toBe('Play');
    });

    it('returns "Replay" when ended', () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ ended: true });

      expect(core.getLabel(playback)).toBe('Replay');
    });

    it('returns "Play" when paused', () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: true });

      expect(core.getLabel(playback)).toBe('Play');
    });

    it('returns "Pause" when playing', () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: false });

      expect(core.getLabel(playback)).toBe('Pause');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label based on playback state', () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: true });

      const attrs = core.getAttrs(playback);

      expect(attrs['aria-label']).toBe('Play');
    });

    it('returns aria-disabled when disabled', () => {
      const core = new PlayButtonCore({ disabled: true });
      const playback = createMockPlayback();

      const attrs = core.getAttrs(playback);

      expect(attrs['aria-disabled']).toBe('true');
    });

    it('returns undefined aria-disabled when not disabled', () => {
      const core = new PlayButtonCore({ disabled: false });
      const playback = createMockPlayback();

      const attrs = core.getAttrs(playback);

      expect(attrs['aria-disabled']).toBeUndefined();
    });

    it('does NOT return data-* attributes', () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: true, ended: false, waiting: true });

      const attrs = core.getAttrs(playback);

      // Verify no data-* keys exist
      const dataKeys = Object.keys(attrs).filter((key) => key.startsWith('data-'));
      expect(dataKeys).toHaveLength(0);
    });
  });

  describe('getState', () => {
    it('returns primitive values only (no methods)', () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: true, ended: false, started: true });

      const state = core.getState(playback);

      expect(state).toEqual({
        paused: true,
        ended: false,
        started: true,
      });

      // Verify no functions in state
      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('includes paused from playback', () => {
      const core = new PlayButtonCore();

      expect(core.getState(createMockPlayback({ paused: true })).paused).toBe(true);
      expect(core.getState(createMockPlayback({ paused: false })).paused).toBe(false);
    });

    it('includes ended from playback', () => {
      const core = new PlayButtonCore();

      expect(core.getState(createMockPlayback({ ended: true })).ended).toBe(true);
      expect(core.getState(createMockPlayback({ ended: false })).ended).toBe(false);
    });

    it('includes started from playback', () => {
      const core = new PlayButtonCore();

      expect(core.getState(createMockPlayback({ started: true })).started).toBe(true);
      expect(core.getState(createMockPlayback({ started: false })).started).toBe(false);
    });
  });

  describe('toggle', () => {
    it('calls play() when paused', async () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: true });

      await core.toggle(playback);

      expect(playback.play).toHaveBeenCalledTimes(1);
      expect(playback.pause).not.toHaveBeenCalled();
    });

    it('calls play() when ended', async () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: false, ended: true });

      await core.toggle(playback);

      expect(playback.play).toHaveBeenCalledTimes(1);
      expect(playback.pause).not.toHaveBeenCalled();
    });

    it('calls pause() when playing', async () => {
      const core = new PlayButtonCore();
      const playback = createMockPlayback({ paused: false, ended: false });

      await core.toggle(playback);

      expect(playback.pause).toHaveBeenCalledTimes(1);
      expect(playback.play).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new PlayButtonCore({ disabled: true });
      const playback = createMockPlayback({ paused: true });

      await core.toggle(playback);

      expect(playback.play).not.toHaveBeenCalled();
      expect(playback.pause).not.toHaveBeenCalled();
    });
  });
});
