import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';

import type { MediaPlaybackRateState } from '../../media/state';
import type { ButtonState } from '../types';
import { PLAYBACK_RATE_BUTTON_DEFAULT_PROPS, type PlaybackRateButtonProps } from './props';

export interface PlaybackRateButtonState extends ButtonState {
  rate: number;
}

export class PlaybackRateButtonCore {
  static readonly defaultProps = PLAYBACK_RATE_BUTTON_DEFAULT_PROPS;

  readonly state = createState<PlaybackRateButtonState>({
    rate: 1,
    label: '',
  });

  #props = { ...PlaybackRateButtonCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;

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

  getAttrs(state: PlaybackRateButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  getState(): PlaybackRateButtonState {
    const media = this.#media!;
    this.state.patch({ rate: media.playbackRate });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  cycle(media: MediaPlaybackRateState): void {
    if (this.#props.disabled) return;
    if (this.#props.menuTrigger) return;

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

export type { PlaybackRateButtonProps } from './props';
