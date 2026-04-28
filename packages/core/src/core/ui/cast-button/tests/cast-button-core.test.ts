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
    });

    it('reflects unsupported availability', () => {
      const core = new CastButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
    });

    it('reflects connecting state', () => {
      const core = new CastButtonCore();
      core.setMedia(createMediaState({ remotePlaybackState: 'connecting' }));
      const state = core.getState();

      expect(state.castState).toBe('connecting');
    });

    it('passes through unsupported availability from media state', () => {
      const core = new CastButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
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

    it('sets aria-disabled when disabled', () => {
      const core = new CastButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls toggleRemotePlayback when disconnected', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackState: 'disconnected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('calls toggleRemotePlayback when connected', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackState: 'connected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new CastButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({ remotePlaybackAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('catches cast errors silently', async () => {
      const core = new CastButtonCore();
      const media = createMediaState({
        toggleRemotePlayback: vi.fn(async () => {
          throw new Error('user cancelled');
        }),
      });
      await expect(core.toggle(media)).resolves.toBeUndefined();
    });
  });
});
