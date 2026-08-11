import { describe, expect, it } from 'vitest';
import { TitleCore, type TitleMediaState } from '../title-core';

function createMediaState(overrides: Partial<TitleMediaState> = {}): TitleMediaState {
  return {
    contentTitle: 'Big Buck Bunny',
    controlsVisible: true,
    ...overrides,
  };
}

describe('TitleCore', () => {
  describe('getState', () => {
    it('returns the resolved content title', () => {
      const core = new TitleCore();

      core.setMedia(createMediaState({ contentTitle: 'Sintel' }));

      expect(core.getState().title).toBe('Sintel');
    });

    it('returns hasTitle: false for the empty resolved title', () => {
      const core = new TitleCore();

      core.setMedia(createMediaState({ contentTitle: '' }));
      const state = core.getState();

      expect(state.hasTitle).toBe(false);
      expect(state.visible).toBe(false);
    });

    it('returns only primitive values (no methods)', () => {
      const core = new TitleCore();

      core.setMedia(createMediaState());
      const state = core.getState();

      expect(state).toEqual({ title: 'Big Buck Bunny', hasTitle: true, visible: true });

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });
  });

  describe('visibility', () => {
    it('is visible when a title exists and controls are visible', () => {
      const core = new TitleCore();

      core.setMedia(createMediaState({ controlsVisible: true }));

      expect(core.getState().visible).toBe(true);
    });

    it('is hidden when controls are hidden', () => {
      const core = new TitleCore();

      core.setMedia(createMediaState({ controlsVisible: false }));

      expect(core.getState().visible).toBe(false);
    });

    it('stays hidden without a title regardless of controls', () => {
      const core = new TitleCore();

      core.setMedia(createMediaState({ contentTitle: '', controlsVisible: true }));

      expect(core.getState().visible).toBe(false);
    });
  });
});
