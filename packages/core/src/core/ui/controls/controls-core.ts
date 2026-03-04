import type { MediaControlsState } from '../../media/state';

export interface ControlsState {
  visible: boolean;
  userActive: boolean;
}

export class ControlsCore {
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
