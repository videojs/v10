import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { ElementProps } from '../../element';
import type { FullscreenState } from '../../media/state';

export interface FullscreenButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: FullscreenButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface FullscreenButtonState extends Pick<FullscreenState, 'fullscreen'> {
  /** Whether fullscreen can be requested on this platform. */
  availability: FullscreenState['fullscreenAvailability'];
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

  getLabel(state: FullscreenState): string {
    const buttonState = this.getState(state);
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(buttonState);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return buttonState.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
  }

  getAttrs(state: FullscreenState): ElementProps {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(state: FullscreenState): FullscreenButtonState {
    return {
      fullscreen: state.fullscreen,
      availability: state.fullscreenAvailability,
    };
  }

  async toggle(state: FullscreenState): Promise<void> {
    if (this.#props.disabled) return;
    if (state.fullscreenAvailability !== 'available') return;

    try {
      if (state.fullscreen) {
        await state.exitFullscreen();
      } else {
        await state.requestFullscreen();
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
