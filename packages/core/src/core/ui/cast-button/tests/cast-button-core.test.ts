import { describe, expect, it, vi } from 'vitest';

import type { MediaRemotePlaybackState } from '../../../media/state';
import type { CastButtonState } from '../cast-button-core';
import { CastButtonCore } from '../cast-button-core';

function createMediaState(overrides: Partial<MediaRemotePlaybackState> = {}): MediaRemotePlaybackState {
  return {
    remotePlaybackState: 'disconnected',
    remotePlaybackAvailability: 'available',
    toggleRemotePlayback: vi.fn(async () => {}),
    ...overrides,
  };
}

function createState(overrides: Partial<CastButtonState> = {}): CastButtonState {
  return {
    castState: 'disconnected',
    availability: 'available',
    disabled: false,
    hidden: false,
    label: '',
    ...overrides,
  };
}

describe('CastButtonCore', () => {
  describe('getState', () => {
    it('projects castState and availability', () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackState: 'connected' });
      core.setMedia(media);
      const state = core.getState();

      expect(state.castState).toBe('connected');
      expect(state.availability).toBe('available');
      expect(state.disabled).toBe(false);
      expect(state.hidden).toBe(false);
    });

    it('marks disabled when no cast device is available', () => {
      const core = new CastButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'unavailable' }));
      const state = core.getState();

      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(false);
    });

    it('marks disabled and hidden when unsupported', () => {
      const core = new CastButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(true);
    });

    it('marks disabled when the disabled prop is set, even if available', () => {
      const core = new CastButtonCore({ disabled: true });
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'available' }));
      const state = core.getState();

      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(false);
    });
  });

  describe('getLabel', () => {
    it('returns Start casting when disconnected', () => {
      const core = new CastButtonCore();
      expect(core.getLabel(createState({ castState: 'disconnected' }))).toBe('Start casting');
    });

    it('returns Stop casting when connected', () => {
      const core = new CastButtonCore();
      expect(core.getLabel(createState({ castState: 'connected' }))).toBe('Stop casting');
    });

    it('returns Connecting when connecting', () => {
      const core = new CastButtonCore();
      expect(core.getLabel(createState({ castState: 'connecting' }))).toBe('Connecting');
    });

    it('returns custom string label', () => {
      const core = new CastButtonCore({ label: 'Cast' });
      expect(core.getLabel(createState())).toBe('Cast');
    });

    it('returns custom function label', () => {
      const core = new CastButtonCore({
        label: (state) => (state.castState === 'connected' ? 'Disconnect' : 'Connect'),
      });
      expect(core.getLabel(createState({ castState: 'connected' }))).toBe('Disconnect');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new CastButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Start casting');
    });

    it('sets aria-disabled when state.disabled is true', () => {
      const core = new CastButtonCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('sets the hidden attribute when state.hidden is true', () => {
      const core = new CastButtonCore();
      const attrs = core.getAttrs(createState({ hidden: true }));
      expect(attrs.hidden).toBe('');
    });
  });

  describe('toggle', () => {
    it('calls toggleRemotePlayback when available', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackState: 'disconnected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('does nothing when the disabled prop is set', async () => {
      const core = new CastButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('does nothing when no cast device is available', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackAvailability: 'unavailable' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('propagates errors from toggleRemotePlayback', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({
        toggleRemotePlayback: vi.fn(async () => {
          throw new Error('user cancelled');
        }),
      });
      await expect(core.toggle(media)).rejects.toThrow('user cancelled');
    });
  });
});
