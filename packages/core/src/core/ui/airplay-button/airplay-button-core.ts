import { createState } from '@videojs/store';
import { supportsWebKitAirplay } from '@videojs/utils/dom';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';

/** Props for the AirPlay button. */
export interface AirplayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: AirplayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state projected for rendering the AirPlay button. */
export interface AirplayButtonState extends ButtonState {
  /** Current AirPlay connection state. */
  state: RemotePlaybackConnectionState;
  /** Whether AirPlay is available on the active platform and media. */
  availability: MediaFeatureAvailability;
}

/**
 * Runtime-agnostic logic for a button that toggles AirPlay to a remote device.
 *
 * Projects remote-playback media state into `AirplayButtonState` and gates
 * availability to WebKit (Safari macOS/iOS), the only platform that surfaces
 * AirPlay. HTML and React bindings wrap this core.
 */
export class AirplayButtonCore {
  static readonly defaultProps: NonNullableObject<AirplayButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<AirplayButtonState>({
    state: 'disconnected',
    availability: 'unsupported',
    label: '',
  });

  #props = { ...AirplayButtonCore.defaultProps };
  #media: MediaRemotePlaybackState | null = null;

  constructor(props?: AirplayButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: AirplayButtonProps): void {
    this.#props = defaults(props, AirplayButtonCore.defaultProps);
  }

  getLabel(state: AirplayButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    if (state.state === 'connected') return 'Stop AirPlay';
    if (state.state === 'connecting') return 'Connecting';
    return 'Start AirPlay';
  }

  getAttrs(state: AirplayButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaRemotePlaybackState): void {
    this.#media = media;
  }

  getState(): AirplayButtonState {
    const media = this.#media!;
    // WebKit (Safari macOS/iOS) is the only platform that surfaces AirPlay.
    // Mirrors the Chromium gate on CastButtonCore so each button only shows
    // on its supported platform.
    const airplaySupported = supportsWebKitAirplay();

    this.state.patch({
      state: media.remotePlaybackState,
      availability: airplaySupported ? media.remotePlaybackAvailability : 'unsupported',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  async toggle(state: MediaRemotePlaybackState): Promise<void> {
    if (this.#props.disabled) return;

    try {
      await state.toggleRemotePlayback();
    } catch {
      // AirPlay requests can fail (user cancelled, permissions, etc.)
    }
  }
}

export namespace AirplayButtonCore {
  export type Props = AirplayButtonProps;
  export type State = AirplayButtonState;
}
