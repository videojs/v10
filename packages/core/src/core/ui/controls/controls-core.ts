import type { MediaControlsState } from '../../media/state';

/** Reactive state surfaced by the controls core. */
export interface ControlsState {
  /** Whether the controls UI is currently shown. */
  visible: boolean;
  /** Whether the user has recently interacted with the player. */
  userActive: boolean;
}

/** Behavior core for the controls layer — exposes visibility and user-activity state. */
export class ControlsCore {
  #media: MediaControlsState | null = null;

  /** Bind the core to a media controls state source. */
  setMedia(media: MediaControlsState): void {
    this.#media = media;
  }

  /** Read controls visibility and user-activity from the bound media. */
  getState(): ControlsState {
    const media = this.#media!;
    return {
      visible: media.controlsVisible,
      userActive: media.userActive,
    };
  }
}

export namespace ControlsCore {
  /** Alias for {@link ControlsState}. */
  export type State = ControlsState;
}
