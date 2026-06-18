import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackState } from '../../media/state';
import { resolveOptionalControlLabel } from '../resolve-optional-control-label';
import type { ButtonState, TranslationKeyOrString } from '../types';

export interface PlayButtonProps {
  /** Custom label for the button. */
  label?: TranslationKeyOrString | ((state: PlayButtonState) => TranslationKeyOrString) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PlayButtonState extends Pick<MediaPlaybackState, 'paused' | 'ended' | 'started'>, ButtonState {}

export class PlayButtonCore {
  static readonly defaultProps: NonNullableObject<PlayButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<PlayButtonState>({
    paused: true,
    ended: false,
    started: false,
    label: '',
  });

  #props = { ...PlayButtonCore.defaultProps };
  #media: MediaPlaybackState | null = null;

  constructor(props?: PlayButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlayButtonProps): void {
    this.#props = defaults(props, PlayButtonCore.defaultProps);
  }

  getLabel(state: PlayButtonState): TranslationKeyOrString {
    const custom = resolveOptionalControlLabel(this.#props.label, state);
    if (custom !== undefined) return custom;

    if (state.ended) return 'replay';
    return state.paused ? 'play' : 'pause';
  }

  getAttrs(state: PlayButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaPlaybackState): void {
    this.#media = media;
  }

  getState(): PlayButtonState {
    const media = this.#media!;

    this.state.patch({ paused: media.paused, ended: media.ended, started: media.started });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  async toggle(media: MediaPlaybackState): Promise<void> {
    if (this.#props.disabled) return;

    if (media.paused || media.ended) {
      return media.play();
    }

    media.pause();
  }
}

export namespace PlayButtonCore {
  export type Props = PlayButtonProps;
  export type State = PlayButtonState;
}
