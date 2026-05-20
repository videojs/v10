import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaVolumeState } from '../../media/state';
import type { ButtonState } from '../types';

/** Coarse volume bucket used to pick a mute-button icon. */
export type VolumeLevel = 'off' | 'low' | 'medium' | 'high';

/** Props for the mute button core. */
export interface MuteButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: MuteButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the mute button core. */
export interface MuteButtonState extends Pick<MediaVolumeState, 'muted'>, ButtonState {
  /**
   * Derived volume level:
   * - `off`: muted or volume is 0
   * - `low`: volume < 0.5
   * - `medium`: volume < 0.75
   * - `high`: volume >= 0.75
   */
  volumeLevel: VolumeLevel;
}

/** Behavior core for the mute button — derives volume level and toggles mute. */
export class MuteButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<MuteButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<MuteButtonState>({
    muted: false,
    volumeLevel: 'off',
    label: '',
  });

  #props = { ...MuteButtonCore.defaultProps };
  #media: MediaVolumeState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: MuteButtonProps) {
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  setProps(props: MuteButtonProps): void {
    this.#props = defaults(props, MuteButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
  getLabel(state: MuteButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.muted ? 'Unmute' : 'Mute';
  }

  /** Compute ARIA attributes from state. */
  getAttrs(state: MuteButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  /** Bind the core to a media volume state source. */
  setMedia(media: MediaVolumeState): void {
    this.#media = media;
  }

  /** Recompute and return the current state. */
  getState(): MuteButtonState {
    const media = this.#media!;
    this.state.patch({ muted: media.muted || media.volume === 0, volumeLevel: getVolumeLevel(media) });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Toggle the muted state of the media (no-op when disabled). */
  toggle(media: MediaVolumeState): void {
    if (this.#props.disabled) return;
    media.toggleMuted();
  }
}

export namespace MuteButtonCore {
  /** Alias for {@link MuteButtonProps}. */
  export type Props = MuteButtonProps;
  /** Alias for {@link MuteButtonState}. */
  export type State = MuteButtonState;
}

function getVolumeLevel(media: MediaVolumeState): VolumeLevel {
  if (media.muted || media.volume === 0) return 'off';
  if (media.volume < 0.5) return 'low';
  if (media.volume < 0.75) return 'medium';
  return 'high';
}
