import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isUndefined } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';
import { createOptionalControlLabelCache } from '../resolve-optional-control-label';
import type { ButtonState, TranslationKeyOrString } from '../types';

export interface PlaybackRateRadioGroupProps {
  /** Custom label for the options group. */
  label?: TranslationKeyOrString | ((state: PlaybackRateRadioGroupState) => TranslationKeyOrString) | undefined;
  /** Custom formatter for visible playback rate labels. */
  formatRate?: ((rate: number) => string) | undefined;
  /** Whether playback rate selection is disabled. */
  disabled?: boolean | undefined;
}

export interface PlaybackRateRadioGroupState extends ButtonState {
  rate: number;
  rates: readonly number[];
  disabled: boolean;
  availability: 'available' | 'unavailable';
}

function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

export class PlaybackRateRadioGroupCore {
  static readonly defaultProps: NonNullableObject<PlaybackRateRadioGroupProps> = {
    label: '',
    formatRate: formatPlaybackRate,
    disabled: false,
  };

  readonly state = createState<PlaybackRateRadioGroupState>({
    rate: 1,
    rates: [],
    disabled: false,
    availability: 'unavailable',
    label: '',
  });

  #props = { ...PlaybackRateRadioGroupCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;
  readonly #customLabel = createOptionalControlLabelCache<PlaybackRateRadioGroupState>();

  constructor(props?: PlaybackRateRadioGroupProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlaybackRateRadioGroupProps): void {
    this.#props = defaults(props, PlaybackRateRadioGroupCore.defaultProps);
    this.#customLabel.invalidate();
  }

  getLabel(state: PlaybackRateRadioGroupState): TranslationKeyOrString {
    const custom = this.#customLabel.resolve(this.#props.label, state);
    if (custom !== undefined) return custom;
    return 'playbackRateAria';
  }

  getLabelParams(state: PlaybackRateRadioGroupState): { rate: number } | undefined {
    if (this.#customLabel.resolve(this.#props.label, state) !== undefined) return undefined;
    return { rate: state.rate };
  }

  getRateLabel(rate: number): string {
    return this.#props.formatRate(rate);
  }

  getRateValue(rate: number): string {
    return String(rate);
  }

  getAttrs(state: PlaybackRateRadioGroupState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  getState(): PlaybackRateRadioGroupState {
    const media = this.#media!;

    const availability: PlaybackRateRadioGroupState['availability'] =
      media.playbackRates.length > 0 ? 'available' : 'unavailable';

    this.state.patch({
      rate: media.playbackRate,
      rates: media.playbackRates,
      disabled: this.#props.disabled || media.playbackRates.length === 0,
      availability,
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

export namespace PlaybackRateRadioGroupCore {
  export type Props = PlaybackRateRadioGroupProps;
  export type State = PlaybackRateRadioGroupState;
}
