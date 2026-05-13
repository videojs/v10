import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction, isUndefined } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';
import type { ButtonState } from '../types';

export interface PlaybackRateButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlaybackRateButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PlaybackRateButtonState extends ButtonState {
  rate: number;
  /** Minimum rate from `playbackRates`, when non-empty. */
  rateMin: number | undefined;
  /** Maximum rate from `playbackRates`, when non-empty. */
  rateMax: number | undefined;
}

export class PlaybackRateButtonCore {
  static readonly defaultProps: NonNullableObject<PlaybackRateButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<PlaybackRateButtonState>({
    rate: 1,
    label: '',
    rateMin: undefined,
    rateMax: undefined,
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

    return 'Playback speed';
  }

  getAttrs(state: PlaybackRateButtonState): Record<string, string | undefined> {
    const rate = PlaybackRateButtonCore.#rateToAriaString(state.rate);

    const attrs: Record<string, string | undefined> = {
      role: 'spinbutton',
      'aria-label': this.getLabel(state),
      'aria-valuenow': rate,
      'aria-valuetext': `${rate}×`,
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };

    if (!isUndefined(state.rateMin)) {
      attrs['aria-valuemin'] = PlaybackRateButtonCore.#rateToAriaString(state.rateMin);
    }
    if (!isUndefined(state.rateMax)) {
      attrs['aria-valuemax'] = PlaybackRateButtonCore.#rateToAriaString(state.rateMax);
    }

    return attrs;
  }

  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  getState(): PlaybackRateButtonState {
    const media = this.#media!;
    const { playbackRates, playbackRate } = media;
    const rateMin = playbackRates.length > 0 ? Math.min(...playbackRates) : undefined;
    const rateMax = playbackRates.length > 0 ? Math.max(...playbackRates) : undefined;

    this.state.patch({ rate: playbackRate, rateMin, rateMax });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
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

  static #rateToAriaString(rate: number): string {
    if (!Number.isFinite(rate)) return '0';
    const rounded = Math.round(rate * 1000) / 1000;
    return String(rounded);
  }
}

export namespace PlaybackRateButtonCore {
  export type Props = PlaybackRateButtonProps;
  export type State = PlaybackRateButtonState;
}
