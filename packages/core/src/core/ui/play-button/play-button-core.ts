import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { ElementProps } from '../../element';
import type { PlaybackState } from '../../media/state';

export interface PlayButtonProps {
  /** Custom label for the button. */
  label?: string | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface PlayButtonState extends Pick<PlaybackState, 'paused' | 'ended' | 'started'> {}

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

  getLabel(playback: PlaybackState): string {
    if (this.#props.label) return this.#props.label;
    if (playback.ended) return 'Replay';
    return playback.paused ? 'Play' : 'Pause';
  }

  getAttrs(playback: PlaybackState): ElementProps {
    return {
      'aria-label': this.getLabel(playback),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(playback: PlaybackState): PlayButtonState {
    return {
      paused: playback.paused,
      ended: playback.ended,
      started: playback.started,
    };
  }

  async toggle(playback: PlaybackState): Promise<void> {
    if (this.#props.disabled) return;

    if (playback.paused || playback.ended) {
      return playback.play();
    }

    playback.pause();
  }
}

export namespace PlayButtonCore {
  export type Props = PlayButtonProps;
  export type State = PlayButtonState;
}
