import { describe, expect, it, vi } from 'vitest';

import type { MediaVolumeState } from '../../../media/state';
import type { MuteButtonState } from '../mute-button-core';
import { MuteButtonCore } from '../mute-button-core';

function createMediaState(overrides: Partial<MediaVolumeState> = {}): MediaVolumeState {
  return {
    volume: 1,
    muted: false,
    volumeAvailability: 'available',
    changeVolume: vi.fn((v: number) => v),
    toggleMute: vi.fn(() => false),
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
      const state = core.getState(media);

      expect(state.muted).toBe(false);
      expect(state.volumeLevel).toBe('high');
    });

    it('returns off when muted', () => {
      const core = new MuteButtonCore();
      const state = core.getState(createMediaState({ muted: true, volume: 0.8 }));

      expect(state.muted).toBe(true);
      expect(state.volumeLevel).toBe('off');
    });

    it('returns off when volume is 0', () => {
      const core = new MuteButtonCore();
      const state = core.getState(createMediaState({ volume: 0 }));
      expect(state.volumeLevel).toBe('off');
    });

    it('returns low when volume < 0.5', () => {
      const core = new MuteButtonCore();
      const state = core.getState(createMediaState({ volume: 0.3 }));
      expect(state.volumeLevel).toBe('low');
    });

    it('returns medium when volume < 0.75', () => {
      const core = new MuteButtonCore();
      const state = core.getState(createMediaState({ volume: 0.6 }));
      expect(state.volumeLevel).toBe('medium');
    });

    it('returns high when volume >= 0.75', () => {
      const core = new MuteButtonCore();
      const state = core.getState(createMediaState({ volume: 0.75 }));
      expect(state.volumeLevel).toBe('high');
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
    it('calls toggleMute', () => {
      const core = new MuteButtonCore();
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleMute).toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const core = new MuteButtonCore({ disabled: true });
      const media = createMediaState();
      core.toggle(media);
      expect(media.toggleMute).not.toHaveBeenCalled();
    });
  });
});
