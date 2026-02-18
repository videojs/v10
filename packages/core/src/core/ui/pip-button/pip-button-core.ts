import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPictureInPictureState } from '../../media/state';

export interface PiPButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PiPButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PiPButtonState extends Pick<MediaPictureInPictureState, 'pip'> {
  /** Whether picture-in-picture can be requested on this platform. */
  availability: MediaPictureInPictureState['pipAvailability'];
}

export class PiPButtonCore {
  static readonly defaultProps: NonNullableObject<PiPButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...PiPButtonCore.defaultProps };

  constructor(props?: PiPButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PiPButtonProps): void {
    this.#props = defaults(props, PiPButtonCore.defaultProps);
  }

  getLabel(state: PiPButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.pip ? 'Exit picture-in-picture' : 'Enter picture-in-picture';
  }

  getAttrs(state: PiPButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(media: MediaPictureInPictureState): PiPButtonState {
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

export namespace PiPButtonCore {
  export type Props = PiPButtonProps;
  export type State = PiPButtonState;
}
