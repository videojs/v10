import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';
import { createOptionalControlLabelCache } from '../resolve-optional-control-label';
import type { ButtonState, TranslationKeyOrString } from '../types';

export interface PlaybackRateButtonProps {
  /** Custom label for the button. */
  label?: TranslationKeyOrString | ((state: PlaybackRateButtonState) => TranslationKeyOrString) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
  /** When true, pointer activation opens a menu instead of cycling. React sets this automatically inside `Menu.Trigger`. */
  menuTrigger?: boolean | undefined;
}

export interface PlaybackRateButtonState extends ButtonState {
  rate: number;
}

export class PlaybackRateButtonCore {
  static readonly defaultProps: NonNullableObject<PlaybackRateButtonProps> = {
    label: '',
    disabled: false,
    menuTrigger: false,
  };

  readonly state = createState<PlaybackRateButtonState>({
    rate: 1,
    label: '',
  });

  #props = { ...PlaybackRateButtonCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;
  readonly #customLabel = createOptionalControlLabelCache<PlaybackRateButtonState>();

  constructor(props?: PlaybackRateButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlaybackRateButtonProps): void {
    this.#props = defaults(props, PlaybackRateButtonCore.defaultProps);
    this.#customLabel.invalidate();
  }

  getLabel(state: PlaybackRateButtonState): TranslationKeyOrString {
    const custom = this.#customLabel.resolve(this.#props.label, state);
    if (custom !== undefined) return custom;

    return 'playbackRateAria';
  }

  getLabelParams(state: PlaybackRateButtonState): { rate: number } | undefined {
    if (this.#customLabel.resolve(this.#props.label, state) !== undefined) return undefined;
    return { rate: state.rate };
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
