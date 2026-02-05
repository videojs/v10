import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { ElementProps } from '../../element';
import type { PresentationState } from '../../media/state';

export interface FullscreenButtonProps {
  label?: string | ((state: FullscreenButtonState) => string) | undefined;
  disabled?: boolean | undefined;
}

export interface FullscreenButtonState extends Pick<PresentationState, 'fullscreenActive' | 'fullscreenAvailability'> {}

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

  getLabel(presentation: PresentationState): string {
    const state = this.getState(presentation);
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.fullscreenActive ? 'Exit fullscreen' : 'Enter fullscreen';
  }

  getAttrs(presentation: PresentationState): ElementProps {
    return {
      'aria-label': this.getLabel(presentation),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(presentation: PresentationState): FullscreenButtonState {
    return {
      fullscreenActive: presentation.fullscreenActive,
      fullscreenAvailability: presentation.fullscreenAvailability,
    };
  }

  async toggle(presentation: PresentationState): Promise<void> {
    if (this.#props.disabled) return;
    if (presentation.fullscreenAvailability !== 'available') return;

    if (presentation.fullscreenActive) {
      await presentation.exitFullscreen();
    } else {
      await presentation.requestFullscreen();
    }
  }
}

export namespace FullscreenButtonCore {
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonState;
}
