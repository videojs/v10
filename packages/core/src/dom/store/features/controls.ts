import type { MediaControlsState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const controlsFeature = definePlayerFeature({
  name: 'controls',
  state: ({ get, set }): MediaControlsState => ({
    userActive: true,
    controlsVisible: true,
    setControls(userActive: boolean, controlsVisible: boolean) {
      set({ userActive, controlsVisible });
    },
    toggleControls() {
      const next = !get().controlsVisible;
      set({ userActive: next, controlsVisible: next });
      return next as boolean;
    },
  }),
});
