import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaRemotePlaybackState } from '../../../media/state';
import type { AirplayButtonState } from '../airplay-button-core';
import { AirplayButtonCore } from '../airplay-button-core';

// AirplayButtonCore reports `availability: 'unsupported'` outside WebKit
// (detected via `WebKitPlaybackTargetAvailabilityEvent` on globalThis).
// jsdom lacks that constructor, so stub it for every test.
function stubWebKit(present: boolean) {
  const key = 'WebKitPlaybackTargetAvailabilityEvent';
  if (present) {
    (globalThis as unknown as Record<string, unknown>)[key] = class {};
  } else {
    delete (globalThis as unknown as Record<string, unknown>)[key];
  }
}

function createMediaState(overrides: Partial<MediaRemotePlaybackState> = {}): MediaRemotePlaybackState {
  return {
    remotePlaybackState: 'disconnected',
    remotePlaybackAvailability: 'available',
    toggleRemotePlayback: vi.fn(async () => {}),
    ...overrides,
  };
}

function createState(overrides: Partial<AirplayButtonState> = {}): AirplayButtonState {
  return {
    airplayState: 'disconnected',
    availability: 'available',
    label: '',
    ...overrides,
  };
}

describe('AirplayButtonCore', () => {
  beforeEach(() => stubWebKit(true));
  afterEach(() => stubWebKit(false));

  describe('getState', () => {
    it('projects airplayState and availability', () => {
      const core = new AirplayButtonCore();
      const media = createMediaState({ remotePlaybackState: 'connected' });
      core.setMedia(media);
      const state = core.getState();

      expect(state.airplayState).toBe('connected');
      expect(state.availability).toBe('available');
    });

    it('reflects unsupported availability', () => {
      const core = new AirplayButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
    });

    it('reflects connecting state', () => {
      const core = new AirplayButtonCore();
      core.setMedia(createMediaState({ remotePlaybackState: 'connecting' }));
      const state = core.getState();

      expect(state.airplayState).toBe('connecting');
    });

    it('reports unsupported outside WebKit', () => {
      stubWebKit(false);
      const core = new AirplayButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'available' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
    });
  });

  describe('getLabel', () => {
    it('returns Start AirPlay when disconnected', () => {
      const core = new AirplayButtonCore();
      expect(core.getLabel(createState({ airplayState: 'disconnected' }))).toBe('Start AirPlay');
    });

    it('returns Stop AirPlay when connected', () => {
      const core = new AirplayButtonCore();
      expect(core.getLabel(createState({ airplayState: 'connected' }))).toBe('Stop AirPlay');
    });

    it('returns Connecting when connecting', () => {
      const core = new AirplayButtonCore();
      expect(core.getLabel(createState({ airplayState: 'connecting' }))).toBe('Connecting');
    });

    it('returns custom string label', () => {
      const core = new AirplayButtonCore({ label: 'AirPlay' });
      expect(core.getLabel(createState())).toBe('AirPlay');
    });

    it('returns custom function label', () => {
      const core = new AirplayButtonCore({
        label: (state) => (state.airplayState === 'connected' ? 'Disconnect' : 'Connect'),
      });
      expect(core.getLabel(createState({ airplayState: 'connected' }))).toBe('Disconnect');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new AirplayButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Start AirPlay');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new AirplayButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls toggleRemotePlayback when disconnected', async () => {
      const core = new AirplayButtonCore();
      const media = createMediaState({ remotePlaybackState: 'disconnected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('calls toggleRemotePlayback when connected', async () => {
      const core = new AirplayButtonCore();
      const media = createMediaState({ remotePlaybackState: 'connected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new AirplayButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', async () => {
      const core = new AirplayButtonCore();
      const media = createMediaState({ remotePlaybackAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('catches AirPlay errors silently', async () => {
      const core = new AirplayButtonCore();
      const media = createMediaState({
        toggleRemotePlayback: vi.fn(async () => {
          throw new Error('user cancelled');
        }),
      });
      await expect(core.toggle(media)).resolves.toBeUndefined();
    });
  });
});
