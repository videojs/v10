import { describe, expect, it, vi } from 'vitest';

import type { MediaVolumeState } from '../../media/state';
import { MuteButtonCore } from './mute-button-core';

function createMockVolume(overrides: Partial<MediaVolumeState> = {}): MediaVolumeState {
  return {
    volume: 1,
    muted: false,
    volumeAvailability: 'available',
    changeVolume: vi.fn(),
    toggleMute: vi.fn(),
    ...overrides,
  };
}

describe('MuteButtonCore', () => {
  describe('getLabel', () => {
    it('returns custom label string when provided', () => {
      const core = new MuteButtonCore({ label: 'Custom Label' });
      const volume = createMockVolume();

      expect(core.getLabel(volume)).toBe('Custom Label');
    });

    it('returns custom label from function when provided', () => {
      const core = new MuteButtonCore({
        label: (state) => (state.muted ? 'Sound On' : 'Sound Off'),
      });
      const volume = createMockVolume({ muted: true });

      expect(core.getLabel(volume)).toBe('Sound On');
    });

    it('falls back to default label when function returns empty string', () => {
      const core = new MuteButtonCore({ label: () => '' });
      const volume = createMockVolume({ muted: false });

      expect(core.getLabel(volume)).toBe('Mute');
    });

    it('returns "Unmute" when muted', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: true });

      expect(core.getLabel(volume)).toBe('Unmute');
    });

    it('returns "Mute" when unmuted', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: false });

      expect(core.getLabel(volume)).toBe('Mute');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label based on mute state', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: true });

      const attrs = core.getAttrs(volume);

      expect(attrs['aria-label']).toBe('Unmute');
    });

    it('returns aria-disabled when disabled', () => {
      const core = new MuteButtonCore({ disabled: true });
      const volume = createMockVolume();

      const attrs = core.getAttrs(volume);

      expect(attrs['aria-disabled']).toBe('true');
    });

    it('returns undefined aria-disabled when not disabled', () => {
      const core = new MuteButtonCore({ disabled: false });
      const volume = createMockVolume();

      const attrs = core.getAttrs(volume);

      expect(attrs['aria-disabled']).toBeUndefined();
    });

    it('does NOT return data-* attributes', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume();

      const attrs = core.getAttrs(volume);

      const dataKeys = Object.keys(attrs).filter((key) => key.startsWith('data-'));
      expect(dataKeys).toHaveLength(0);
    });
  });

  describe('getState', () => {
    it('returns primitive values only (no methods)', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: true, volume: 0.2 });

      const state = core.getState(volume);

      expect(state).toEqual({ muted: true, volumeLevel: 'off' });

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('returns off when muted', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: true, volume: 1 });

      expect(core.getState(volume).volumeLevel).toBe('off');
    });

    it('returns off when volume is zero', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: false, volume: 0 });

      expect(core.getState(volume).volumeLevel).toBe('off');
    });

    it('returns low when volume is below 0.5', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: false, volume: 0.4 });

      expect(core.getState(volume).volumeLevel).toBe('low');
    });

    it('returns medium when volume is below 0.75', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: false, volume: 0.6 });

      expect(core.getState(volume).volumeLevel).toBe('medium');
    });

    it('returns high when volume is 0.75 or above', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume({ muted: false, volume: 0.9 });

      expect(core.getState(volume).volumeLevel).toBe('high');
    });
  });

  describe('toggle', () => {
    it('calls toggleMute when enabled', () => {
      const core = new MuteButtonCore();
      const volume = createMockVolume();

      core.toggle(volume);

      expect(volume.toggleMute).toHaveBeenCalledTimes(1);
    });

    it('does nothing when disabled', () => {
      const core = new MuteButtonCore({ disabled: true });
      const volume = createMockVolume();

      core.toggle(volume);

      expect(volume.toggleMute).not.toHaveBeenCalled();
    });
  });
});
