import { describe, expect, it } from 'vitest';

import type { MediaControlsState } from '../../../media/state';
import { ControlsCore } from '../controls-core';

describe('ControlsCore', () => {
  describe('getState', () => {
    it('returns visible: true when controlsVisible is true', () => {
      const core = new ControlsCore();
      const media = createControlsState({ controlsVisible: true });

      expect(core.getState(media)).toEqual({ visible: true, userActive: true });
    });

    it('returns visible: false when controlsVisible is false', () => {
      const core = new ControlsCore();
      const media = createControlsState({ controlsVisible: false });

      expect(core.getState(media)).toEqual({ visible: false, userActive: true });
    });

    it('returns userActive: false when userActive is false', () => {
      const core = new ControlsCore();
      const media = createControlsState({ userActive: false });

      expect(core.getState(media)).toEqual({ visible: true, userActive: false });
    });

    it('projects visible and userActive independently', () => {
      const core = new ControlsCore();

      // All four quadrants of the 2x2 boolean matrix
      expect(core.getState(createControlsState({ controlsVisible: true, userActive: true }))).toEqual({
        visible: true,
        userActive: true,
      });

      expect(core.getState(createControlsState({ controlsVisible: true, userActive: false }))).toEqual({
        visible: true,
        userActive: false,
      });

      expect(core.getState(createControlsState({ controlsVisible: false, userActive: true }))).toEqual({
        visible: false,
        userActive: true,
      });

      expect(core.getState(createControlsState({ controlsVisible: false, userActive: false }))).toEqual({
        visible: false,
        userActive: false,
      });
    });

    it('returns only primitive values', () => {
      const core = new ControlsCore();
      const state = core.getState(createControlsState());

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });
  });
});

function createControlsState(overrides: Partial<MediaControlsState> = {}): MediaControlsState {
  return {
    userActive: true,
    controlsVisible: true,
    ...overrides,
  };
}
