import type { MediaControlsState } from '../../media/state';

export interface ControlsState {
  visible: boolean;
  userActive: boolean;
}

export class ControlsCore {
  #media: MediaControlsState | null = null;

  setMedia(media: MediaControlsState): void {
    this.#media = media;
  }

  getState(): ControlsState {
    const media = this.#media!;
    return {
      visible: media.controlsVisible,
      userActive: media.userActive,
    };
  }
}

export namespace ControlsCore {
  export type State = ControlsState;
}
