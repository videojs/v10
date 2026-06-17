import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaRemotePlaybackState } from '../../../media/state';
import type { AirPlayButtonState } from '../airplay-button-core';
import { AirPlayButtonCore } from '../airplay-button-core';

// AirPlayButtonCore reports `availability: 'unsupported'` outside WebKit
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

function createState(overrides: Partial<AirPlayButtonState> = {}): AirPlayButtonState {
  return {
    state: 'disconnected',
    availability: 'available',
    label: '',
    ...overrides,
  };
}

describe('AirPlayButtonCore', () => {
  beforeEach(() => stubWebKit(true));
  afterEach(() => stubWebKit(false));

  describe('getState', () => {
    it('projects state and availability', () => {
      const core = new AirPlayButtonCore();
      const media = createMediaState({ remotePlaybackState: 'connected' });
      core.setMedia(media);
      const result = core.getState();

      expect(result.state).toBe('connected');
      expect(result.availability).toBe('available');
    });

    it('reflects unsupported availability', () => {
      const core = new AirPlayButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
    });

    it('reflects connecting state', () => {
      const core = new AirPlayButtonCore();
      core.setMedia(createMediaState({ remotePlaybackState: 'connecting' }));
      const result = core.getState();

      expect(result.state).toBe('connecting');
    });

    it('reports unsupported outside WebKit', () => {
      stubWebKit(false);
      const core = new AirPlayButtonCore();
      core.setMedia(createMediaState({ remotePlaybackAvailability: 'available' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
    });
  });

  describe('getLabel', () => {
    it('returns Start AirPlay when disconnected', () => {
      const core = new AirPlayButtonCore();
      expect(core.getLabel(createState({ state: 'disconnected' }))).toBe('Start AirPlay');
    });

    it('returns Stop AirPlay when connected', () => {
      const core = new AirPlayButtonCore();
      expect(core.getLabel(createState({ state: 'connected' }))).toBe('Stop AirPlay');
    });

    it('returns Connecting when connecting', () => {
      const core = new AirPlayButtonCore();
      expect(core.getLabel(createState({ state: 'connecting' }))).toBe('Connecting');
    });

    it('returns custom string label', () => {
      const core = new AirPlayButtonCore({ label: 'AirPlay' });
      expect(core.getLabel(createState())).toBe('AirPlay');
    });

    it('returns custom function label', () => {
      const core = new AirPlayButtonCore({
        label: (state) => (state.state === 'connected' ? 'Disconnect' : 'Connect'),
      });
      expect(core.getLabel(createState({ state: 'connected' }))).toBe('Disconnect');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new AirPlayButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Start AirPlay');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new AirPlayButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls toggleRemotePlayback when disconnected', async () => {
      const core = new AirPlayButtonCore();
      const media = createMediaState({ remotePlaybackState: 'disconnected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('calls toggleRemotePlayback when connected', async () => {
      const core = new AirPlayButtonCore();
      const media = createMediaState({ remotePlaybackState: 'connected' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new AirPlayButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.toggleRemotePlayback).not.toHaveBeenCalled();
    });

    it('toggles regardless of availability (the button is hidden when unavailable)', async () => {
      const core = new AirPlayButtonCore();
      const media = createMediaState({ remotePlaybackAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.toggleRemotePlayback).toHaveBeenCalled();
    });

    it('catches AirPlay errors silently', async () => {
      const core = new AirPlayButtonCore();
      const media = createMediaState({
        toggleRemotePlayback: vi.fn(async () => {
          throw new Error('user cancelled');
        }),
      });
      await expect(core.toggle(media)).resolves.toBeUndefined();
    });
  });
});
