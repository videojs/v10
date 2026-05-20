import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';

export interface AirplayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: AirplayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface AirplayButtonState extends ButtonState {
  airplayState: RemotePlaybackConnectionState;
  availability: MediaFeatureAvailability;
}

export class AirplayButtonCore {
  static readonly defaultProps: NonNullableObject<AirplayButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<AirplayButtonState>({
    airplayState: 'disconnected',
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

    if (state.airplayState === 'connected') return 'Stop AirPlay';
    if (state.airplayState === 'connecting') return 'Connecting';
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
    // WebKit (Safari macOS/iOS) is the only platform that surfaces AirPlay
    // through the W3C Remote Playback API. Mirrors the Chromium gate on
    // CastButtonCore so each button only shows on its supported platform.
    const airplaySupported = 'WebKitPlaybackTargetAvailabilityEvent' in globalThis;

    this.state.patch({
      airplayState: media.remotePlaybackState,
      availability: airplaySupported ? media.remotePlaybackAvailability : 'unsupported',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  async toggle(state: MediaRemotePlaybackState): Promise<void> {
    if (this.#props.disabled) return;
    if (state.remotePlaybackAvailability !== 'available') return;

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
