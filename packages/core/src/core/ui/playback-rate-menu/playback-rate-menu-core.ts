import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction, isUndefined } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';
import type { ButtonState } from '../types';

export interface PlaybackRateMenuProps {
  /** Custom label for the menu trigger. */
  label?: string | ((state: PlaybackRateMenuState) => string) | undefined;
  /** Custom formatter for visible playback rate labels. */
  formatRate?: ((rate: number) => string) | undefined;
  /** Whether playback rate selection is disabled. */
  disabled?: boolean | undefined;
}

export interface PlaybackRateMenuState extends ButtonState {
  rate: number;
  rates: readonly number[];
  disabled: boolean;
}

function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

export class PlaybackRateMenuCore {
  static readonly defaultProps: NonNullableObject<PlaybackRateMenuProps> = {
    label: '',
    formatRate: formatPlaybackRate,
    disabled: false,
  };

  readonly state = createState<PlaybackRateMenuState>({
    rate: 1,
    rates: [],
    disabled: false,
    label: '',
  });

  #props = { ...PlaybackRateMenuCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;

  constructor(props?: PlaybackRateMenuProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlaybackRateMenuProps): void {
    this.#props = defaults(props, PlaybackRateMenuCore.defaultProps);
  }

  getLabel(state: PlaybackRateMenuState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return `Playback rate ${state.rate}`;
  }

  getRateLabel(rate: number): string {
    return this.#props.formatRate(rate);
  }

  getRateValue(rate: number): string {
    return String(rate);
  }

  getAttrs(state: PlaybackRateMenuState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  getState(): PlaybackRateMenuState {
    const media = this.#media!;

    this.state.patch({
      rate: media.playbackRate,
      rates: media.playbackRates,
      disabled: this.#props.disabled || media.playbackRates.length === 0,
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  select(media: MediaPlaybackRateState, rate: number): void {
    if (this.#props.disabled) return;
    if (!media.playbackRates.includes(rate)) return;

    media.setPlaybackRate(rate);
  }

  selectValue(media: MediaPlaybackRateState, value: string): void {
    const rate = media.playbackRates.find((candidate) => this.getRateValue(candidate) === value);
    if (isUndefined(rate)) return;

    this.select(media, rate);
  }
}

export namespace PlaybackRateMenuCore {
  export type Props = PlaybackRateMenuProps;
  export type State = PlaybackRateMenuState;
}
