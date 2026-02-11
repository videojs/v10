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
    ...overrides,
  };
}

function createState(overrides: Partial<FullscreenButtonState> = {}): FullscreenButtonState {
  return {
    fullscreen: false,
    availability: 'available',
    ...overrides,
  };
}

describe('FullscreenButtonCore', () => {
  describe('getState', () => {
    it('projects fullscreen and availability', () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreen: true });
      const state = core.getState(media);

      expect(state.fullscreen).toBe(true);
      expect(state.availability).toBe('available');
    });

    it('reflects unsupported availability', () => {
      const core = new FullscreenButtonCore();
      const state = core.getState(createMediaState({ fullscreenAvailability: 'unsupported' }));

      expect(state.availability).toBe('unsupported');
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
      const core = new FullscreenButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('toggle', () => {
    it('calls requestFullscreen when not fullscreen', async () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreen: false });
      await core.toggle(media);
      expect(media.requestFullscreen).toHaveBeenCalled();
    });

    it('calls exitFullscreen when fullscreen', async () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreen: true });
      await core.toggle(media);
      expect(media.exitFullscreen).toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new FullscreenButtonCore({ disabled: true });
      const media = createMediaState();
      await core.toggle(media);
      expect(media.requestFullscreen).not.toHaveBeenCalled();
    });

    it('does nothing when unsupported', async () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({ fullscreenAvailability: 'unsupported' });
      await core.toggle(media);
      expect(media.requestFullscreen).not.toHaveBeenCalled();
    });

    it('catches fullscreen errors silently', async () => {
      const core = new FullscreenButtonCore();
      const media = createMediaState({
        requestFullscreen: vi.fn(async () => {
          throw new Error('permission denied');
        }),
      });
      await expect(core.toggle(media)).resolves.toBeUndefined();
    });
  });
});
