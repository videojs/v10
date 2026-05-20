import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the play button core. */
export interface PlayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: PlayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the play button core. */
export interface PlayButtonState extends Pick<MediaPlaybackState, 'paused' | 'ended' | 'started'>, ButtonState {}

/** Behavior core for the play button — derives label and toggles playback. */
export class PlayButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<PlayButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<PlayButtonState>({
    paused: true,
    ended: false,
    started: false,
    label: '',
  });

  #props = { ...PlayButtonCore.defaultProps };
  #media: MediaPlaybackState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: PlayButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlayButtonProps): void {
    this.#props = defaults(props, PlayButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
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

  setMedia(media: MediaPlaybackState): void {
    this.#media = media;
  }

  getState(): PlayButtonState {
    const media = this.#media!;

    this.state.patch({ paused: media.paused, ended: media.ended, started: media.started });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Play when paused or ended, pause otherwise (no-op when disabled). */
  async toggle(media: MediaPlaybackState): Promise<void> {
    if (this.#props.disabled) return;

    if (media.paused || media.ended) {
      return media.play();
    }

    media.pause();
  }
}

export namespace PlayButtonCore {
  /** Alias for {@link PlayButtonProps}. */
  export type Props = PlayButtonProps;
  /** Alias for {@link PlayButtonState}. */
  export type State = PlayButtonState;
}
