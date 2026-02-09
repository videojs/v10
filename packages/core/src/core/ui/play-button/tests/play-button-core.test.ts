import { describe, expect, it, vi } from 'vitest';

import type { MediaPlaybackState } from '../../../media/state';
import type { PlayButtonState } from '../play-button-core';
import { PlayButtonCore } from '../play-button-core';

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

function createState(overrides: Partial<PlayButtonState> = {}): PlayButtonState {
  return {
    paused: true,
    ended: false,
    started: false,
    ...overrides,
  };
}

describe('PlayButtonCore', () => {
  describe('setProps', () => {
    it('uses default props', () => {
      const core = new PlayButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBeUndefined();
    });

    it('accepts constructor props', () => {
      const core = new PlayButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('getState', () => {
    it('projects data fields from media state', () => {
      const core = new PlayButtonCore();
      const media = createMediaState({ paused: true, ended: false, started: true });
      const state = core.getState(media);

      expect(state.paused).toBe(true);
      expect(state.ended).toBe(false);
      expect(state.started).toBe(true);
    });

    it('reflects playing state', () => {
      const core = new PlayButtonCore();
      const state = core.getState(createMediaState({ paused: false, started: true }));

      expect(state.paused).toBe(false);
      expect(state.started).toBe(true);
    });
  });

  describe('getLabel', () => {
    it('returns Play when paused', () => {
      const core = new PlayButtonCore();
      expect(core.getLabel(createState({ paused: true }))).toBe('Play');
    });

    it('returns Pause when playing', () => {
      const core = new PlayButtonCore();
      expect(core.getLabel(createState({ paused: false }))).toBe('Pause');
    });

    it('returns Replay when ended', () => {
      const core = new PlayButtonCore();
      expect(core.getLabel(createState({ ended: true }))).toBe('Replay');
    });

    it('returns custom string label', () => {
      const core = new PlayButtonCore({ label: 'Start' });
      expect(core.getLabel(createState())).toBe('Start');
    });

    it('returns custom function label', () => {
      const core = new PlayButtonCore({
        label: (state) => (state.paused ? 'Resume' : 'Stop'),
      });
      expect(core.getLabel(createState({ paused: true }))).toBe('Resume');
    });

    it('falls back to default when function returns empty', () => {
      const core = new PlayButtonCore({ label: () => '' });
      expect(core.getLabel(createState({ paused: true }))).toBe('Play');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new PlayButtonCore();
      const attrs = core.getAttrs(createState({ paused: true }));
      expect(attrs['aria-label']).toBe('Play');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new PlayButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('omits aria-disabled when not disabled', () => {
      const core = new PlayButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBeUndefined();
    });
  });

  describe('toggle', () => {
    it('calls play when paused', async () => {
      const core = new PlayButtonCore();
      const media = createMediaState({ paused: true });
      await core.toggle(media);
      expect(media.play).toHaveBeenCalled();
    });

    it('calls pause when playing', async () => {
      const core = new PlayButtonCore();
      const media = createMediaState({ paused: false });
      await core.toggle(media);
      expect(media.pause).toHaveBeenCalled();
    });

    it('calls play when ended', async () => {
      const core = new PlayButtonCore();
      const media = createMediaState({ ended: true });
      await core.toggle(media);
      expect(media.play).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new PlayButtonCore({ disabled: true });
      const media = createMediaState({ paused: true });
      await core.toggle(media);
      expect(media.play).not.toHaveBeenCalled();
    });
  });
});
