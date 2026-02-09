import { describe, expect, it, vi } from 'vitest';

import type { MediaFullscreenState } from '../../media/state';
import { FullscreenButtonCore } from './fullscreen-button-core';

function createMockFullscreen(overrides: Partial<MediaFullscreenState> = {}): MediaFullscreenState {
  return {
    fullscreen: false,
    fullscreenAvailability: 'available',
    requestFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    ...overrides,
  };
}

describe('FullscreenButtonCore', () => {
  describe('getLabel', () => {
    it('returns custom label string when provided', () => {
      const core = new FullscreenButtonCore({ label: 'Custom Label' });
      const state = createMockFullscreen();

      expect(core.getLabel(state)).toBe('Custom Label');
    });

    it('returns custom label from function when provided', () => {
      const core = new FullscreenButtonCore({
        label: (state) => (state.fullscreen ? 'Exit' : 'Enter'),
      });
      const state = createMockFullscreen({ fullscreen: true });

      expect(core.getLabel(state)).toBe('Exit');
    });

    it('falls back to default label when function returns empty string', () => {
      const core = new FullscreenButtonCore({ label: () => '' });
      const state = createMockFullscreen({ fullscreen: false });

      expect(core.getLabel(state)).toBe('Enter fullscreen');
    });

    it('returns "Exit fullscreen" when active', () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreen: true });

      expect(core.getLabel(state)).toBe('Exit fullscreen');
    });

    it('returns "Enter fullscreen" when not active', () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreen: false });

      expect(core.getLabel(state)).toBe('Enter fullscreen');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label based on fullscreen state', () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreen: true });

      const attrs = core.getAttrs(state);

      expect(attrs['aria-label']).toBe('Exit fullscreen');
    });

    it('returns aria-disabled when disabled', () => {
      const core = new FullscreenButtonCore({ disabled: true });
      const state = createMockFullscreen();

      const attrs = core.getAttrs(state);

      expect(attrs['aria-disabled']).toBe('true');
    });

    it('returns undefined aria-disabled when not disabled', () => {
      const core = new FullscreenButtonCore({ disabled: false });
      const state = createMockFullscreen();

      const attrs = core.getAttrs(state);

      expect(attrs['aria-disabled']).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('returns primitive values only (no methods)', () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreen: true });

      const buttonState = core.getState(state);

      expect(buttonState).toEqual({
        fullscreen: true,
        availability: 'available',
      });

      const functionKeys = Object.entries(buttonState).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('picks fullscreen from state', () => {
      const core = new FullscreenButtonCore();

      expect(core.getState(createMockFullscreen({ fullscreen: true })).fullscreen).toBe(true);
      expect(core.getState(createMockFullscreen({ fullscreen: false })).fullscreen).toBe(false);
    });

    it('picks availability from state', () => {
      const core = new FullscreenButtonCore();

      expect(core.getState(createMockFullscreen({ fullscreenAvailability: 'unsupported' })).availability).toBe(
        'unsupported'
      );
    });
  });

  describe('toggle', () => {
    it('calls requestFullscreen when not active', async () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreen: false });

      await core.toggle(state);

      expect(state.requestFullscreen).toHaveBeenCalledTimes(1);
      expect(state.exitFullscreen).not.toHaveBeenCalled();
    });

    it('calls exitFullscreen when active', async () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreen: true });

      await core.toggle(state);

      expect(state.exitFullscreen).toHaveBeenCalledTimes(1);
      expect(state.requestFullscreen).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new FullscreenButtonCore({ disabled: true });
      const state = createMockFullscreen();

      await core.toggle(state);

      expect(state.requestFullscreen).not.toHaveBeenCalled();
      expect(state.exitFullscreen).not.toHaveBeenCalled();
    });

    it('does nothing when availability is not available', async () => {
      const core = new FullscreenButtonCore();
      const state = createMockFullscreen({ fullscreenAvailability: 'unsupported' });

      await core.toggle(state);

      expect(state.requestFullscreen).not.toHaveBeenCalled();
      expect(state.exitFullscreen).not.toHaveBeenCalled();
    });
  });
});
