import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPictureInPictureState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the picture-in-picture button core. */
export interface PiPButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PiPButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the picture-in-picture button core. */
export interface PiPButtonState extends Pick<MediaPictureInPictureState, 'pip'>, ButtonState {
  /** Whether picture-in-picture can be requested on this platform. */
  availability: MediaPictureInPictureState['pipAvailability'];
}

/** Behavior core for the picture-in-picture button — derives label and toggles PiP. */
export class PiPButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<PiPButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<PiPButtonState>({
    pip: false,
    availability: 'available',
    label: '',
  });

  #props = { ...PiPButtonCore.defaultProps };
  #media: MediaPictureInPictureState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: PiPButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PiPButtonProps): void {
    this.#props = defaults(props, PiPButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
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

  setMedia(media: MediaPictureInPictureState): void {
    this.#media = media;
  }

  getState(): PiPButtonState {
    const media = this.#media!;
    this.state.patch({ pip: media.pip, availability: media.pipAvailability });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Enter or exit picture-in-picture depending on current state (no-op when disabled or unavailable). */
  async toggle(media: MediaPictureInPictureState): Promise<void> {
    if (this.#props.disabled) return;
    if (media.pipAvailability !== 'available') return;

    try {
      if (media.pip) {
        await media.exitPictureInPicture();
      } else {
        await media.requestPictureInPicture();
      }
    } catch {
      // PiP requests can fail (user gesture required, permissions, etc.)
    }
  }
}

export namespace PiPButtonCore {
  /** Alias for {@link PiPButtonProps}. */
  export type Props = PiPButtonProps;
  /** Alias for {@link PiPButtonState}. */
  export type State = PiPButtonState;
}
