import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaFullscreenState } from '../../media/state';
import type { ButtonState } from '../types';

export interface FullscreenButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: FullscreenButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface FullscreenButtonState extends Pick<MediaFullscreenState, 'fullscreen'>, ButtonState {
  /** Whether fullscreen can be requested on this platform. */
  availability: MediaFullscreenState['fullscreenAvailability'];
  /** Whether the button is non-interactive (explicitly disabled or feature not available). */
  disabled: boolean;
  /** Whether the button is hidden because the feature is unsupported. */
  hidden: boolean;
}

export class FullscreenButtonCore {
  static readonly defaultProps: NonNullableObject<FullscreenButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<FullscreenButtonState>({
    fullscreen: false,
    availability: 'available',
    disabled: false,
    hidden: false,
    label: '',
  });

  #props = { ...FullscreenButtonCore.defaultProps };
  #media: MediaFullscreenState | null = null;

  constructor(props?: FullscreenButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: FullscreenButtonProps): void {
    this.#props = defaults(props, FullscreenButtonCore.defaultProps);
  }

  getLabel(state: FullscreenButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
  }

  getAttrs(state: FullscreenButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled || state.hidden ? 'true' : undefined,
      hidden: state.hidden || undefined,
    };
  }

  setMedia(media: MediaFullscreenState): void {
    this.#media = media;
  }

  getState(): FullscreenButtonState {
    const media = this.#media!;
    const availability = media.fullscreenAvailability;
    const disabled = this.#props.disabled || availability !== 'available';
    const hidden = availability === 'unsupported';
    this.state.patch({ fullscreen: media.fullscreen, availability, disabled, hidden });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  toggle(media: MediaFullscreenState): void | Promise<void> {
    if (this.#props.disabled) return;
    if (media.fullscreenAvailability !== 'available') return;

    // Call synchronously to preserve the user activation token (iOS Safari
    // requires fullscreen requests within the same event handler tick).
    if (media.fullscreen) {
      return media.exitFullscreen();
    } else {
      return media.requestFullscreen();
    }
  }
}

export namespace FullscreenButtonCore {
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonState;
}
