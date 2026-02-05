import { describe, expect, it, vi } from 'vitest';

import type { PresentationState } from '../../media/state';
import { FullscreenButtonCore } from './fullscreen-button-core';

function createMockPresentation(overrides: Partial<PresentationState> = {}): PresentationState {
  return {
    fullscreenActive: false,
    pipActive: false,
    fullscreenAvailability: 'available',
    pipAvailability: 'available',
    requestFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    requestPiP: vi.fn(),
    exitPiP: vi.fn(),
    ...overrides,
  };
}

describe('FullscreenButtonCore', () => {
  describe('getLabel', () => {
    it('returns custom label string when provided', () => {
      const core = new FullscreenButtonCore({ label: 'Custom Label' });
      const presentation = createMockPresentation();

      expect(core.getLabel(presentation)).toBe('Custom Label');
    });

    it('returns custom label from function when provided', () => {
      const core = new FullscreenButtonCore({
        label: (state) => (state.fullscreenActive ? 'Exit' : 'Enter'),
      });
      const presentation = createMockPresentation({ fullscreenActive: true });

      expect(core.getLabel(presentation)).toBe('Exit');
    });

    it('falls back to default label when function returns empty string', () => {
      const core = new FullscreenButtonCore({ label: () => '' });
      const presentation = createMockPresentation({ fullscreenActive: false });

      expect(core.getLabel(presentation)).toBe('Enter fullscreen');
    });

    it('returns "Exit fullscreen" when active', () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenActive: true });

      expect(core.getLabel(presentation)).toBe('Exit fullscreen');
    });

    it('returns "Enter fullscreen" when not active', () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenActive: false });

      expect(core.getLabel(presentation)).toBe('Enter fullscreen');
    });
  });

  describe('getAttrs', () => {
    it('returns aria-label based on fullscreen state', () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenActive: true });

      const attrs = core.getAttrs(presentation);

      expect(attrs['aria-label']).toBe('Exit fullscreen');
    });

    it('returns aria-disabled when disabled', () => {
      const core = new FullscreenButtonCore({ disabled: true });
      const presentation = createMockPresentation();

      const attrs = core.getAttrs(presentation);

      expect(attrs['aria-disabled']).toBe('true');
    });

    it('returns undefined aria-disabled when not disabled', () => {
      const core = new FullscreenButtonCore({ disabled: false });
      const presentation = createMockPresentation();

      const attrs = core.getAttrs(presentation);

      expect(attrs['aria-disabled']).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('returns primitive values only (no methods)', () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenActive: true });

      const state = core.getState(presentation);

      expect(state).toEqual({
        fullscreenActive: true,
        fullscreenAvailability: 'available',
      });

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });

    it('picks fullscreenActive from presentation', () => {
      const core = new FullscreenButtonCore();

      expect(core.getState(createMockPresentation({ fullscreenActive: true })).fullscreenActive).toBe(true);
      expect(core.getState(createMockPresentation({ fullscreenActive: false })).fullscreenActive).toBe(false);
    });

    it('picks fullscreenAvailability from presentation', () => {
      const core = new FullscreenButtonCore();

      expect(
        core.getState(createMockPresentation({ fullscreenAvailability: 'unsupported' })).fullscreenAvailability
      ).toBe('unsupported');
    });
  });

  describe('toggle', () => {
    it('calls requestFullscreen when not active', async () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenActive: false });

      await core.toggle(presentation);

      expect(presentation.requestFullscreen).toHaveBeenCalledTimes(1);
      expect(presentation.exitFullscreen).not.toHaveBeenCalled();
    });

    it('calls exitFullscreen when active', async () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenActive: true });

      await core.toggle(presentation);

      expect(presentation.exitFullscreen).toHaveBeenCalledTimes(1);
      expect(presentation.requestFullscreen).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new FullscreenButtonCore({ disabled: true });
      const presentation = createMockPresentation();

      await core.toggle(presentation);

      expect(presentation.requestFullscreen).not.toHaveBeenCalled();
      expect(presentation.exitFullscreen).not.toHaveBeenCalled();
    });

    it('does nothing when availability is not available', async () => {
      const core = new FullscreenButtonCore();
      const presentation = createMockPresentation({ fullscreenAvailability: 'unsupported' });

      await core.toggle(presentation);

      expect(presentation.requestFullscreen).not.toHaveBeenCalled();
      expect(presentation.exitFullscreen).not.toHaveBeenCalled();
    });
  });
});
