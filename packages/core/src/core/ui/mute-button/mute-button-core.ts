import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { ElementProps } from '../../element';
import type { VolumeState } from '../../media/state';

export type VolumeLevel = 'off' | 'low' | 'medium' | 'high';

export interface MuteButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: MuteButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface MuteButtonState {
  /** Whether audio is muted. */
  muted: boolean;
  /**
   * Derived volume level:
   * - `off`: muted or volume is 0
   * - `low`: volume < 0.5
   * - `medium`: volume < 0.75
   * - `high`: volume >= 0.75
   */
  volumeLevel: VolumeLevel;
}

export class MuteButtonCore {
  static readonly defaultProps: NonNullableObject<MuteButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...MuteButtonCore.defaultProps };

  constructor(props?: MuteButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: MuteButtonProps): void {
    this.#props = defaults(props, MuteButtonCore.defaultProps);
  }

  getLabel(volume: VolumeState): string {
    const state = this.getState(volume);
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.muted ? 'Unmute' : 'Mute';
  }

  getAttrs(volume: VolumeState): ElementProps {
    return {
      'aria-label': this.getLabel(volume),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  getState(volume: VolumeState): MuteButtonState {
    return {
      muted: volume.muted,
      volumeLevel: getVolumeLevel(volume),
    };
  }

  toggle(volume: VolumeState): void {
    if (this.#props.disabled) return;
    volume.toggleMute();
  }
}

export namespace MuteButtonCore {
  export type Props = MuteButtonProps;
  export type State = MuteButtonState;
}

function getVolumeLevel(volume: VolumeState): VolumeLevel {
  if (volume.muted || volume.volume === 0) return 'off';
  if (volume.volume < 0.5) return 'low';
  if (volume.volume < 0.75) return 'medium';
  return 'high';
}
