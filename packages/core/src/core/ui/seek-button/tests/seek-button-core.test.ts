import { describe, expect, it, vi } from 'vitest';

import type { MediaTimeState } from '../../../media/state';
import type { SeekButtonState } from '../seek-button-core';
import { SeekButtonCore } from '../seek-button-core';

function createMediaState(overrides: Partial<MediaTimeState> = {}): MediaTimeState {
  return {
    currentTime: 0,
    duration: 300,
    seeking: false,
    seek: vi.fn(async (time: number) => time),
    ...overrides,
  };
}

function createState(overrides: Partial<SeekButtonState> = {}): SeekButtonState {
  return {
    seeking: false,
    direction: 'forward',
    ...overrides,
  };
}

describe('SeekButtonCore', () => {
  describe('setProps', () => {
    it('uses default props', () => {
      const core = new SeekButtonCore();
      const state = core.getState(createMediaState());
      expect(state.direction).toBe('forward');
    });

    it('accepts constructor props', () => {
      const core = new SeekButtonCore({ seconds: -10 });
      const state = core.getState(createMediaState());
      expect(state.direction).toBe('backward');
    });

    it('accepts disabled via constructor', () => {
      const core = new SeekButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('getState', () => {
    it('projects seeking from media state', () => {
      const core = new SeekButtonCore();
      const state = core.getState(createMediaState({ seeking: true }));
      expect(state.seeking).toBe(true);
    });

    it('derives forward direction from positive seconds', () => {
      const core = new SeekButtonCore({ seconds: 15 });
      const state = core.getState(createMediaState());
      expect(state.direction).toBe('forward');
    });

    it('derives backward direction from negative seconds', () => {
      const core = new SeekButtonCore({ seconds: -15 });
      const state = core.getState(createMediaState());
      expect(state.direction).toBe('backward');
    });

    it('defaults to forward direction', () => {
      const core = new SeekButtonCore();
      const state = core.getState(createMediaState());
      expect(state.direction).toBe('forward');
    });
  });

  describe('getLabel', () => {
    it('returns forward label for forward direction', () => {
      const core = new SeekButtonCore({ seconds: 30 });
      expect(core.getLabel(createState({ direction: 'forward' }))).toBe('Seek forward 30 seconds');
    });

    it('returns backward label for backward direction', () => {
      const core = new SeekButtonCore({ seconds: -10 });
      expect(core.getLabel(createState({ direction: 'backward' }))).toBe('Seek backward 10 seconds');
    });

    it('uses absolute value in backward label', () => {
      const core = new SeekButtonCore({ seconds: -30 });
      const label = core.getLabel(createState({ direction: 'backward' }));
      expect(label).toBe('Seek backward 30 seconds');
      expect(label).not.toContain('-');
    });

    it('returns custom string label', () => {
      const core = new SeekButtonCore({ label: 'Skip' });
      expect(core.getLabel(createState())).toBe('Skip');
    });

    it('returns custom function label', () => {
      const core = new SeekButtonCore({
        label: (state) => (state.direction === 'backward' ? 'Rewind' : 'Skip ahead'),
      });
      expect(core.getLabel(createState({ direction: 'backward' }))).toBe('Rewind');
      expect(core.getLabel(createState({ direction: 'forward' }))).toBe('Skip ahead');
    });

    it('falls back to default when function returns empty', () => {
      const core = new SeekButtonCore({ seconds: 10, label: () => '' });
      expect(core.getLabel(createState({ direction: 'forward' }))).toBe('Seek forward 10 seconds');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new SeekButtonCore({ seconds: 30 });
      const attrs = core.getAttrs(createState({ direction: 'forward' }));
      expect(attrs['aria-label']).toBe('Seek forward 30 seconds');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new SeekButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('omits aria-disabled when not disabled', () => {
      const core = new SeekButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBeUndefined();
    });
  });

  describe('seek', () => {
    it('seeks forward by seconds offset', async () => {
      const core = new SeekButtonCore({ seconds: 30 });
      const media = createMediaState({ currentTime: 60 });
      await core.seek(media);
      expect(media.seek).toHaveBeenCalledWith(90);
    });

    it('seeks backward by negative seconds offset', async () => {
      const core = new SeekButtonCore({ seconds: -10 });
      const media = createMediaState({ currentTime: 60 });
      await core.seek(media);
      expect(media.seek).toHaveBeenCalledWith(50);
    });

    it('does not clamp the target time', async () => {
      const core = new SeekButtonCore({ seconds: -30 });
      const media = createMediaState({ currentTime: 10 });
      await core.seek(media);
      // Clamping is the store's responsibility, not the button's.
      expect(media.seek).toHaveBeenCalledWith(-20);
    });

    it('does nothing when disabled', async () => {
      const core = new SeekButtonCore({ disabled: true, seconds: 30 });
      const media = createMediaState({ currentTime: 60 });
      await core.seek(media);
      expect(media.seek).not.toHaveBeenCalled();
    });
  });
});
