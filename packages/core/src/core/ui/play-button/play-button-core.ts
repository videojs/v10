import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackState } from '../../media/state';

export interface PlayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PlayButtonState extends Pick<MediaPlaybackState, 'paused' | 'ended' | 'started'> {}

export class PlayButtonCore {
  static readonly defaultProps: NonNullableObject<PlayButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...PlayButtonCore.defaultProps };

  constructor(props?: PlayButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlayButtonProps): void {
    this.#props = defaults(props, PlayButtonCore.defaultProps);
  }

  getLabel(state: PlayButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    if (state.ended) return 'Replay';
    return state.paused ? 'Play' : 'Pause';
  }

  getAttrs(state: PlayButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(media: MediaPlaybackState): PlayButtonState {
    return {
      paused: media.paused,
      ended: media.ended,
      started: media.started,
    };
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
