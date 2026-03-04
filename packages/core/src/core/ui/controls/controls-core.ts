import type { MediaControlsState } from '../../media/state';
import type { UICore } from '../types';

export interface ControlsState {
  visible: boolean;
  userActive: boolean;
}

export class ControlsCore implements UICore<{}, ControlsState> {
  getState(media: MediaControlsState): ControlsState {
    return {
      visible: media.controlsVisible,
      userActive: media.userActive,
    };
  }
}

export namespace ControlsCore {
  export type State = ControlsState;
}
