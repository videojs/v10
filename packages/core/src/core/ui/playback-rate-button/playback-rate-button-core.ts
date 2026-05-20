import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the playback rate button core. */
export interface PlaybackRateButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlaybackRateButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the playback rate button core. */
export interface PlaybackRateButtonState extends ButtonState {
  /** Current playback rate multiplier (1 = normal). */
  rate: number;
}

/** Behavior core for the playback rate button — cycles through the allowed playback rates. */
export class PlaybackRateButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<PlaybackRateButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<PlaybackRateButtonState>({
    rate: 1,
    label: '',
  });

  #props = { ...PlaybackRateButtonCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: PlaybackRateButtonProps) {
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  setProps(props: PlaybackRateButtonProps): void {
    this.#props = defaults(props, PlaybackRateButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
  getLabel(state: PlaybackRateButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return `Playback rate ${state.rate}`;
  }

  /** Compute ARIA attributes from state. */
  getAttrs(state: PlaybackRateButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  /** Bind the core to a media playback rate state source. */
  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  /** Recompute and return the current state. */
  getState(): PlaybackRateButtonState {
    const media = this.#media!;
    this.state.patch({ rate: media.playbackRate });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Advance to the next allowed playback rate, wrapping at the end (no-op when disabled). */
  cycle(media: MediaPlaybackRateState): void {
    if (this.#props.disabled) return;

    const { playbackRates, playbackRate } = media;
    if (playbackRates.length === 0) return;

    const idx = playbackRates.indexOf(playbackRate);
    const next =
      idx === -1
        ? (playbackRates.find((r) => r > playbackRate) ?? playbackRates[0]!)
        : playbackRates[(idx + 1) % playbackRates.length]!;

    media.setPlaybackRate(next);
  }
}

export namespace PlaybackRateButtonCore {
  /** Alias for {@link PlaybackRateButtonProps}. */
  export type Props = PlaybackRateButtonProps;
  /** Alias for {@link PlaybackRateButtonState}. */
  export type State = PlaybackRateButtonState;
}
