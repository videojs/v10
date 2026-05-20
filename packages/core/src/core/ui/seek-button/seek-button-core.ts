import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTimeState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the seek button core. */
export interface SeekButtonProps {
  /** Seconds to seek. Positive = forward, negative = backward. Default `30`. */
  seconds?: number | undefined;
  /** Custom label for the button. */
  label?: string | ((state: SeekButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Direction the seek button moves the playhead. */
export type SeekButtonDirection = 'forward' | 'backward';

/** Reactive state surfaced by the seek button core. */
export interface SeekButtonState extends ButtonState {
  /** Whether a seek is in progress. */
  seeking: boolean;
  /** Whether the button seeks forward or backward. */
  direction: SeekButtonDirection;
}

/** Behavior core for the seek button — jumps the playhead by a fixed offset. */
export class SeekButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<SeekButtonProps> = {
    seconds: 30,
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<SeekButtonState>({
    seeking: false,
    direction: 'forward',
    label: '',
  });

  #props = { ...SeekButtonCore.defaultProps };
  #media: MediaTimeState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: SeekButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: SeekButtonProps): void {
    this.#props = defaults(props, SeekButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
  getLabel(state: SeekButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    const abs = Math.abs(this.#props.seconds);
    return state.direction === 'backward' ? `Seek backward ${abs} seconds` : `Seek forward ${abs} seconds`;
  }

  getAttrs(state: SeekButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaTimeState): void {
    this.#media = media;
  }

  getState(): SeekButtonState {
    const media = this.#media!;
    const direction: SeekButtonDirection = this.#props.seconds < 0 ? 'backward' : 'forward';

    this.state.patch({ seeking: media.seeking, direction });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Move the playhead by the configured offset (no-op when disabled). */
  async seek(media: MediaTimeState): Promise<void> {
    if (this.#props.disabled) return;
    await media.seek(media.currentTime + this.#props.seconds);
  }
}

export namespace SeekButtonCore {
  /** Alias for {@link SeekButtonProps}. */
  export type Props = SeekButtonProps;
  /** Alias for {@link SeekButtonState}. */
  export type State = SeekButtonState;
}
