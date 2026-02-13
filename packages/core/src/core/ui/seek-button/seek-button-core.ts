import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTimeState } from '../../media/state';

export interface SeekButtonProps {
  /** Seconds to seek. Positive = forward, negative = backward. Default `30`. */
  seconds?: number | undefined;
  /** Custom label for the button. */
  label?: string | ((state: SeekButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface SeekButtonState {
  /** Whether a seek is in progress. */
  seeking: boolean;
  /** The seconds offset (from props). */
  seconds: number;
}

export class SeekButtonCore {
  static readonly defaultProps: NonNullableObject<SeekButtonProps> = {
    seconds: 30,
    label: '',
    disabled: false,
  };

  #props = { ...SeekButtonCore.defaultProps };

  constructor(props?: SeekButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: SeekButtonProps): void {
    this.#props = defaults(props, SeekButtonCore.defaultProps);
  }

  getLabel(state: SeekButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    const abs = Math.abs(state.seconds);
    return state.seconds < 0 ? `Seek backward ${abs} seconds` : `Seek forward ${abs} seconds`;
  }

  getAttrs(state: SeekButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(media: MediaTimeState): SeekButtonState {
    return {
      seeking: media.seeking,
      seconds: this.#props.seconds,
    };
  }

  async seek(media: MediaTimeState): Promise<void> {
    if (this.#props.disabled) return;
    await media.seek(media.currentTime + this.#props.seconds);
  }
}

export namespace SeekButtonCore {
  export type Props = SeekButtonProps;
  export type State = SeekButtonState;
}
