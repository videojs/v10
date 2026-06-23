import type { MediaControlsState, MediaErrorState } from '../../media/state';

export interface OverlayMediaState {
  controls?: MediaControlsState | null | undefined;
  error?: MediaErrorState | null | undefined;
}

export interface OverlayState {
  visible: boolean;
  controlsVisible: boolean;
  errorVisible: boolean;
}

export class OverlayCore {
  #media: OverlayMediaState = {};

  setMedia(media: OverlayMediaState): void {
    this.#media = media;
  }

  getState(): OverlayState {
    const controlsVisible = this.#media.controls?.controlsVisible ?? false;
    const errorVisible = Boolean(this.#media.error?.error);

    return {
      visible: controlsVisible || errorVisible,
      controlsVisible,
      errorVisible,
    };
  }
}

export namespace OverlayCore {
  export type MediaState = OverlayMediaState;
  export type State = OverlayState;
}
