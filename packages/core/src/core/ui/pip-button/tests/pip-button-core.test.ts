import { describe, expect, it, vi } from 'vitest';

import type { MediaPictureInPictureState } from '../../../media/state';
import type { PipButtonState } from '../pip-button-core';
import { PipButtonCore } from '../pip-button-core';

function createMediaState(overrides: Partial<MediaPictureInPictureState> = {}): MediaPictureInPictureState {
  return {
    pip: false,
    pipAvailability: 'available',
    requestPiP: vi.fn(async () => {}),
    exitPiP: vi.fn(async () => {}),
    ...overrides,
  };
}

function createState(overrides: Partial<PipButtonState> = {}): PipButtonState {
  return {
    pip: false,
    availability: 'available',
    ...overrides,
  };
}

describe('PipButtonCore', () => {
  describe('getState', () => {
    it('projects pip and availability', () => {
      const core = new PipButtonCore();
      const media = createMediaState({ pip: true });
      const state = core.getState(media);

      expect(state.pip).toBe(true);
      expect(state.availability).toBe('available');
    });

    it('reflects unsupported availability', () => {
      const core = new PipButtonCore();
      const state = core.getState(createMediaState({ pipAvailability: 'unsupported' }));

      expect(state.availability).toBe('unsupported');
    });
  });

  describe('getLabel', () => {
    it('returns Enter PiP when not in PiP', () => {
      const core = new PipButtonCore();
      expect(core.getLabel(createState({ pip: false }))).toBe('Enter PiP');
    });

    it('returns Exit PiP when in PiP', () => {
      const core = new PipButtonCore();
      expect(core.getLabel(createState({ pip: true }))).toBe('Exit PiP');
    });

    it('returns custom string label', () => {
      const core = new PipButtonCore({ label: 'Picture-in-picture' });
      expect(core.getLabel(createState())).toBe('Picture-in-picture');
    });

    it('returns custom function label', () => {
      const core = new PipButtonCore({
        label: (state) => (state.pip ? 'Leave mini player' : 'Mini player'),
      });
      expect(core.getLabel(createState({ pip: true }))).toBe('Leave mini player');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new PipButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Enter PiP');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new PipButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls requestPiP when not in PiP', async () => {
      const core = new PipButtonCore();
      const media = createMediaState({ pip: false });
      await core.toggle(media);
      expect(media.requestPiP).toHaveBeenCalled();
    });

    it('calls exitPiP when in PiP', async () => {
      const core = new PipButtonCore();
      const media = createMediaState({ pip: true });
      await core.toggle(media);
      expect(media.exitPiP).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new PipButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.requestPiP).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', async () => {
      const core = new PipButtonCore();
      const media = createMediaState({ pipAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.requestPiP).not.toHaveBeenCalled();
    });

    it('catches PiP errors silently', async () => {
      const core = new PipButtonCore();
      const media = createMediaState({
        requestPiP: vi.fn(async () => {
          throw new Error('permission denied');
        }),
      });
      await expect(core.toggle(media)).resolves.toBeUndefined();
    });
  });
});
