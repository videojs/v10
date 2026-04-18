import { describe, expect, it, vi } from 'vitest';

import type { MediaFullscreenState } from '../../../media/state';
import type { FullscreenButtonState } from '../fullscreen-button-core';
import { FullscreenButtonCore } from '../fullscreen-button-core';

function createMediaState(overrides: Partial<MediaFullscreenState> = {}): MediaFullscreenState {
  return {
    fullscreen: false,
    fullscreenAvailability: 'available',
    requestFullscreen: vi.fn(async () => {}),
    exitFullscreen: vi.fn(async () => {}),
    toggleFullscreen: vi.fn(async () => {}),
    ...overrides,
  };
}

function createState(overrides: Partial<FullscreenButtonState> = {}): FullscreenButtonState {
  return {
    fullscreen: false,
    availability: 'available',
    disabled: false,
    hidden: false,
    label: '',
    ...overrides,
  };
}

describe('FullscreenButtonCore', () => {
  describe('getState', () => {
    it('projects fullscreen and availability', () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreen: true });
      core.setMedia(media);
      const state = core.getState();

      expect(state.fullscreen).toBe(true);
      expect(state.availability).toBe('available');
    });

    it('reflects unsupported availability', () => {
      const core = new FullscreenButtonCore();
      core.setMedia(createMediaState({ fullscreenAvailability: 'unsupported' }));
      const state = core.getState();

      expect(state.availability).toBe('unsupported');
    });

    it('sets disabled and hidden when unsupported', () => {
      const core = new FullscreenButtonCore();
      core.setMedia(createMediaState({ fullscreenAvailability: 'unsupported' }));
      expect(core.getState().disabled).toBe(true);
      expect(core.getState().hidden).toBe(true);
    });

    it('clears disabled and hidden when available', () => {
      const core = new FullscreenButtonCore();
      core.setMedia(createMediaState({ fullscreenAvailability: 'available' }));
      expect(core.getState().disabled).toBe(false);
      expect(core.getState().hidden).toBe(false);
    });

    it('sets disabled from prop', () => {
      const core = new FullscreenButtonCore({ disabled: true });
      core.setMedia(createMediaState());
      expect(core.getState().disabled).toBe(true);
    });
  });

  describe('getLabel', () => {
    it('returns Enter fullscreen when not fullscreen', () => {
      const core = new FullscreenButtonCore();
      expect(core.getLabel(createState({ fullscreen: false }))).toBe('Enter fullscreen');
    });

    it('returns Exit fullscreen when fullscreen', () => {
      const core = new FullscreenButtonCore();
      expect(core.getLabel(createState({ fullscreen: true }))).toBe('Exit fullscreen');
    });

    it('returns custom string label', () => {
      const core = new FullscreenButtonCore({ label: 'Full screen' });
      expect(core.getLabel(createState())).toBe('Full screen');
    });

    it('returns custom function label', () => {
      const core = new FullscreenButtonCore({
        label: (state) => (state.fullscreen ? 'Minimize' : 'Maximize'),
      });
      expect(core.getLabel(createState({ fullscreen: true }))).toBe('Minimize');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label', () => {
      const core = new FullscreenButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-label']).toBe('Enter fullscreen');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new FullscreenButtonCore();
      const attrs = core.getAttrs(createState({ disabled: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('sets aria-disabled when hidden', () => {
      const core = new FullscreenButtonCore();
      const attrs = core.getAttrs(createState({ hidden: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('omits aria-disabled when available and not disabled', () => {
      const core = new FullscreenButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBeUndefined();
    });

    it('sets hidden attr when hidden', () => {
      const core = new FullscreenButtonCore();
      const attrs = core.getAttrs(createState({ hidden: true }));
      expect(attrs.hidden).toBe(true);
    });

    it('omits hidden attr when not hidden', () => {
      const core = new FullscreenButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs.hidden).toBeUndefined();
    });
  });

  describe('toggle', () => {
    it('calls requestFullscreen when not fullscreen', () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreen: false });
      core.toggle(media);
      expect(media.requestFullscreen).toHaveBeenCalled();
    });

    it('calls exitFullscreen when fullscreen', () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreen: true });
      core.toggle(media);
      expect(media.exitFullscreen).toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const core = new FullscreenButtonCore({ disabled: true });
      const media = createMediaState();
      core.toggle(media);
      expect(media.requestFullscreen).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreenAvailability: 'unsupported' });
      core.toggle(media);
      expect(media.requestFullscreen).not.toHaveBeenCalled();
    });

    it('catches fullscreen errors silently', () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({
        requestFullscreen: vi.fn(async () => {
          throw new Error('permission denied');
        }),
      });
      expect(() => core.toggle(media)).not.toThrow();
    });
  });
});
