import { describe, expect, it } from 'vitest';

import type { MediaControlsState } from '../../../media/state';
import { ControlsCore } from '../controls-core';

describe('ControlsCore', () => {
  describe('getState', () => {
    it('returns visible: true when controlsVisible is true', () => {
      const core = new ControlsCore();
      const media = createControlsState({ controlsVisible: true });

      core.setMedia(media);
      expect(core.getState()).toEqual({ visible: true, userActive: true });
    });

    it('returns visible: false when controlsVisible is false', () => {
      const core = new ControlsCore();
      const media = createControlsState({ controlsVisible: false });

      core.setMedia(media);
      expect(core.getState()).toEqual({ visible: false, userActive: true });
    });

    it('returns userActive: false when userActive is false', () => {
      const core = new ControlsCore();
      const media = createControlsState({ userActive: false });

      core.setMedia(media);
      expect(core.getState()).toEqual({ visible: true, userActive: false });
    });

    it('projects visible and userActive independently', () => {
      const core = new ControlsCore();

      // All four quadrants of the 2x2 boolean matrix
      core.setMedia(createControlsState({ controlsVisible: true, userActive: true }));
      expect(core.getState()).toEqual({
        visible: true,
        userActive: true,
      });

      core.setMedia(createControlsState({ controlsVisible: true, userActive: false }));
      expect(core.getState()).toEqual({
        visible: true,
        userActive: false,
      });

      core.setMedia(createControlsState({ controlsVisible: false, userActive: true }));
      expect(core.getState()).toEqual({
        visible: false,
        userActive: true,
      });

      core.setMedia(createControlsState({ controlsVisible: false, userActive: false }));
      expect(core.getState()).toEqual({
        visible: false,
        userActive: false,
      });
    });

    it('returns only primitive values', () => {
      const core = new ControlsCore();
      core.setMedia(createControlsState());
      const state = core.getState();

      const functionKeys = Object.entries(state).filter(([, value]) => typeof value === 'function');
      expect(functionKeys).toHaveLength(0);
    });
  });
});

function createControlsState(overrides: Partial<MediaControlsState> = {}): MediaControlsState {
  return {
    userActive: true,
    controlsVisible: true,
    setControls: () => {},
    toggleControls: () => true,
    ...overrides,
  };
}
