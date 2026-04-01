import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';

export interface PlaybackRateButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlaybackRateButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PlaybackRateButtonState {
  rate: number;
}

export class PlaybackRateButtonCore {
  static readonly defaultProps: NonNullableObject<PlaybackRateButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...PlaybackRateButtonCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;
  #suppressLabel = false;

  constructor(props?: PlaybackRateButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlaybackRateButtonProps): void {
    this.#props = defaults(props, PlaybackRateButtonCore.defaultProps);
  }

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

  setSuppressLabel(value: boolean): void {
    this.#suppressLabel = value;
  }

  getAttrs(state: PlaybackRateButtonState) {
    return {
      'aria-label': this.#suppressLabel ? undefined : this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  getState(): PlaybackRateButtonState {
    const media = this.#media!;
    return {
      rate: media.playbackRate,
    };
  }

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
  export type Props = PlaybackRateButtonProps;
  export type State = PlaybackRateButtonState;
}
