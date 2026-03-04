import { describe, expect, it, vi } from 'vitest';

import type { MediaVolumeState } from '../../../media/state';
import type { MuteButtonState } from '../mute-button-core';
import { MuteButtonCore } from '../mute-button-core';

function createMediaState(overrides: Partial<MediaVolumeState> = {}): MediaVolumeState {
  return {
    volume: 1,
    muted: false,
    volumeAvailability: 'available',
    setVolume: vi.fn((v: number) => v),
    toggleMuted: vi.fn(() => false),
    ...overrides,
  };
}

function createState(overrides: Partial<MuteButtonState> = {}): MuteButtonState {
  return {
    muted: false,
    volumeLevel: 'high',
    ...overrides,
  };
}

describe('MuteButtonCore', () => {
  describe('getState', () => {
    it('projects muted and volumeLevel', () => {
      const core = new MuteButtonCore();
      const media = createMediaState({ muted: false, volume: 1 });
      core.setMedia(media);
      const state = core.getState();

      expect(state.muted).toBe(false);
      expect(state.volumeLevel).toBe('high');
    });

    it('returns off when muted', () => {
      const core = new MuteButtonCore();
      core.setMedia(createMediaState({ muted: true, volume: 0.8 }));
      const state = core.getState();

      expect(state.muted).toBe(true);
      expect(state.volumeLevel).toBe('off');
    });

    it('returns off when volume is 0', () => {
      const core = new MuteButtonCore();
      core.setMedia(createMediaState({ volume: 0 }));
      expect(core.getState().volumeLevel).toBe('off');
    });

    it('returns low when volume < 0.5', () => {
      const core = new MuteButtonCore();
      core.setMedia(createMediaState({ volume: 0.3 }));
      expect(core.getState().volumeLevel).toBe('low');
    });

    it('returns medium when volume < 0.75', () => {
      const core = new MuteButtonCore();
      core.setMedia(createMediaState({ volume: 0.6 }));
      expect(core.getState().volumeLevel).toBe('medium');
    });

    it('returns high when volume >= 0.75', () => {
      const core = new MuteButtonCore();
      core.setMedia(createMediaState({ volume: 0.75 }));
      expect(core.getState().volumeLevel).toBe('high');
    });
  });

  describe('getLabel', () => {
    it('returns Mute when unmuted', () => {
      const core = new MuteButtonCore();
      expect(core.getLabel(createState({ muted: false }))).toBe('Mute');
    });

    it('returns Unmute when muted', () => {
      const core = new MuteButtonCore();
      expect(core.getLabel(createState({ muted: true }))).toBe('Unmute');
    });

    it('returns custom string label', () => {
      const core = new MuteButtonCore({ label: 'Toggle sound' });
      expect(core.getLabel(createState())).toBe('Toggle sound');
    });

    it('returns custom function label', () => {
      const core = new MuteButtonCore({
        label: (state) => (state.muted ? 'Sound on' : 'Sound off'),
      });
      expect(core.getLabel(createState({ muted: true }))).toBe('Sound on');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new MuteButtonCore();
      const attrs = core.getAttrs(createState({ muted: false }));
      expect(attrs['aria-label']).toBe('Mute');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new MuteButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls toggleMuted', () => {
      const core = new MuteButtonCore();
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleMuted).toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const core = new MuteButtonCore({ disabled: true });
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleMuted).not.toHaveBeenCalled();
    });
  });
});
