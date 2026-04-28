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
  /** Non-interactive but still focusable (mirrors `aria-disabled`). */
  disabled: boolean;
  /** Removed from the layout because fullscreen is unsupported. */
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
      'aria-disabled': state.disabled ? 'true' : undefined,
      hidden: state.hidden ? '' : undefined,
    };
  }

  setMedia(media: MediaFullscreenState): void {
    this.#media = media;
  }

  getState(): FullscreenButtonState {
    const media = this.#media!;
    const availability = media.fullscreenAvailability;

    this.state.patch({
      fullscreen: media.fullscreen,
      availability,
      disabled: this.#props.disabled || availability !== 'available',
      hidden: availability === 'unsupported',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  async toggle(media: MediaFullscreenState): Promise<void> {
    this.setMedia(media);
    if (this.getState().disabled) return;
    return media.fullscreen ? media.exitFullscreen() : media.requestFullscreen();
  }
}

export namespace FullscreenButtonCore {
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonState;
}
