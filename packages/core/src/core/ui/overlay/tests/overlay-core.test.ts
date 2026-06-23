import { describe, expect, it } from 'vitest';

import type { MediaControlsState, MediaErrorState } from '../../../media/state';
import { OverlayCore } from '../overlay-core';

describe('OverlayCore', () => {
  describe('getState', () => {
    it('is visible when controls are visible', () => {
      const core = new OverlayCore();

      core.setMedia({ controls: createControlsState({ controlsVisible: true }), error: createErrorState() });

      expect(core.getState()).toEqual({
        visible: true,
        controlsVisible: true,
        errorVisible: false,
      });
    });

    it('is visible when an error is active', () => {
      const core = new OverlayCore();

      core.setMedia({
        controls: createControlsState({ controlsVisible: false }),
        error: createErrorState({ code: 1, message: 'failed' }),
      });

      expect(core.getState()).toEqual({
        visible: true,
        controlsVisible: false,
        errorVisible: true,
      });
    });

    it('is hidden when neither controls nor error need it', () => {
      const core = new OverlayCore();

      core.setMedia({ controls: createControlsState({ controlsVisible: false }), error: createErrorState() });

      expect(core.getState()).toEqual({
        visible: false,
        controlsVisible: false,
        errorVisible: false,
      });
    });

    it('treats missing feature state as hidden', () => {
      const core = new OverlayCore();

      core.setMedia({});

      expect(core.getState()).toEqual({
        visible: false,
        controlsVisible: false,
        errorVisible: false,
      });
    });
  });
});

function createControlsState(overrides: Partial<MediaControlsState> = {}): MediaControlsState {
  return {
    userActive: true,
    controlsVisible: true,
    toggleControls: () => true,
    ...overrides,
  };
}

function createErrorState(error: MediaErrorState['error'] = null): MediaErrorState {
  return {
    error,
    dismissError: () => {},
  };
}
