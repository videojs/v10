import { describe, expect, it, vi } from 'vitest';

import type { MediaPictureInPictureState } from '../../../media/state';
import type { PiPButtonState } from '../pip-button-core';
import { PiPButtonCore } from '../pip-button-core';

function createMediaState(overrides: Partial<MediaPictureInPictureState> = {}): MediaPictureInPictureState {
  return {
    pip: false,
    pipAvailability: 'available',
    requestPictureInPicture: vi.fn(async () => {}),
    exitPictureInPicture: vi.fn(async () => {}),
    togglePictureInPicture: vi.fn(async () => {}),
    ...overrides,
  };
}

function createState(overrides: Partial<PiPButtonState> = {}): PiPButtonState {
  return {
    pip: false,
    availability: 'available',
    disabled: false,
    hidden: false,
    label: '',
    ...overrides,
  };
}

describe('PiPButtonCore', () => {
  describe('getState', () => {
    it('projects pip and availability', () => {
      const core = new PiPButtonCore();
      const media = createMediaState({ pip: true });
      core.setMedia(media);
      const state = core.getState();

      expect(state.pip).toBe(true);
      expect(state.availability).toBe('available');
      expect(state.disabled).toBe(false);
      expect(state.hidden).toBe(false);
    });

    it('marks disabled and hidden when unsupported', () => {
      const core = new PiPButtonCore();
      core.setMedia(createMediaState({ pipAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(true);
    });

    it('marks disabled when the disabled prop is set', () => {
      const core = new PiPButtonCore({ disabled: true });
      core.setMedia(createMediaState({ pipAvailability: 'available' }));
      const state = core.getState();

      expect(state.disabled).toBe(true);
      expect(state.hidden).toBe(false);
    });
  });

  describe('getLabel', () => {
    it('returns Enter picture-in-picture when not in PiP', () => {
      const core = new PiPButtonCore();
      expect(core.getLabel(createState({ pip: false }))).toBe('Enter picture-in-picture');
    });

    it('returns Exit picture-in-picture when in PiP', () => {
      const core = new PiPButtonCore();
      expect(core.getLabel(createState({ pip: true }))).toBe('Exit picture-in-picture');
    });

    it('returns custom string label', () => {
      const core = new PiPButtonCore({ label: 'Picture-in-picture' });
      expect(core.getLabel(createState())).toBe('Picture-in-picture');
    });

    it('returns custom function label', () => {
      const core = new PiPButtonCore({
        label: (state) => (state.pip ? 'Leave mini player' : 'Mini player'),
      });
      expect(core.getLabel(createState({ pip: true }))).toBe('Leave mini player');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new PiPButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Enter picture-in-picture');
    });

    it('sets aria-disabled when state.disabled is true', () => {
      const core = new PiPButtonCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('sets the hidden attribute when state.hidden is true', () => {
      const core = new PiPButtonCore();
      const attrs = core.getAttrs(createState({ hidden: true }));
      expect(attrs.hidden).toBe('');
    });
  });

  describe('toggle', () => {
    it('calls requestPictureInPicture when not in PiP', async () => {
      const core = new PiPButtonCore();
      const media = createMediaState({ pip: false });
      await core.toggle(media);
      expect(media.requestPictureInPicture).toHaveBeenCalled();
    });

    it('calls exitPictureInPicture when in PiP', async () => {
      const core = new PiPButtonCore();
      const media = createMediaState({ pip: true });
      await core.toggle(media);
      expect(media.exitPictureInPicture).toHaveBeenCalled();
    });

    it('does nothing when the disabled prop is set', async () => {
      const core = new PiPButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.requestPictureInPicture).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', async () => {
      const core = new PiPButtonCore();
      const media = createMediaState({ pipAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.requestPictureInPicture).not.toHaveBeenCalled();
    });

    it('propagates errors from requestPictureInPicture', async () => {
      const core = new PiPButtonCore();
      const media = createMediaState({
        requestPictureInPicture: vi.fn(async () => {
          throw new Error('permission denied');
        }),
      });
      await expect(core.toggle(media)).rejects.toThrow('permission denied');
    });
  });
});
