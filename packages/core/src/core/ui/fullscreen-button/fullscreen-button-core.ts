import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaFullscreenState } from '../../media/state';

export interface FullscreenButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: FullscreenButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface FullscreenButtonState extends Pick<MediaFullscreenState, 'fullscreen'> {
  /** Whether fullscreen can be requested on this platform. */
  availability: MediaFullscreenState['fullscreenAvailability'];
}

export class FullscreenButtonCore {
  static readonly defaultProps: NonNullableObject<FullscreenButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...FullscreenButtonCore.defaultProps };

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
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(media: MediaFullscreenState): FullscreenButtonState {
    return {
      fullscreen: media.fullscreen,
      availability: media.fullscreenAvailability,
    };
  }

  async toggle(media: MediaFullscreenState): Promise<void> {
    if (this.#props.disabled) return;
    if (media.fullscreenAvailability !== 'available') return;

    try {
      if (media.fullscreen) {
        await media.exitFullscreen();
      } else {
        await media.requestFullscreen();
      }
    } catch {
      // Fullscreen requests can fail (user gesture required, permissions, etc.)
    }
  }
}

export namespace FullscreenButtonCore {
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonState;
}
