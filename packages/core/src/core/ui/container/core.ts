import type { MediaControlsState } from '@videojs/media';

export interface ContainerState {
  controlsVisible: boolean;
}

export class ContainerCore {
  #media: MediaControlsState | null = null;

  setMedia(media: MediaControlsState): void {
    this.#media = media;
  }

  getState(): ContainerState {
    return {
      controlsVisible: this.#media!.controlsVisible,
    };
  }
}

export namespace ContainerCore {
  export type State = ContainerState;
}
