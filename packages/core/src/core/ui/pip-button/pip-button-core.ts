import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPictureInPictureState } from '../../media/state';

export interface PipButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PipButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PipButtonState extends Pick<MediaPictureInPictureState, 'pip'> {
  /** Whether picture-in-picture can be requested on this platform. */
  availability: MediaPictureInPictureState['pipAvailability'];
}

export class PipButtonCore {
  static readonly defaultProps: NonNullableObject<PipButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...PipButtonCore.defaultProps };

  constructor(props?: PipButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PipButtonProps): void {
    this.#props = defaults(props, PipButtonCore.defaultProps);
  }

  getLabel(state: PipButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.pip ? 'Exit PiP' : 'Enter PiP';
  }

  getAttrs(state: PipButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(media: MediaPictureInPictureState): PipButtonState {
    return {
      pip: media.pip,
      availability: media.pipAvailability,
    };
  }

  async toggle(media: MediaPictureInPictureState): Promise<void> {
    if (this.#props.disabled) return;
    if (media.pipAvailability !== 'available') return;

    try {
      if (media.pip) {
        await media.exitPiP();
      } else {
        await media.requestPiP();
      }
    } catch {
      // PiP requests can fail (user gesture required, permissions, etc.)
    }
  }
}

export namespace PipButtonCore {
  export type Props = PipButtonProps;
  export type State = PipButtonState;
}
