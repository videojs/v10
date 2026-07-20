import { createState } from '@videojs/store';
import { supportsWebKitAirPlay } from '@videojs/utils/dom';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';
import { resolveLabel } from '../utils/resolve-label';

export interface AirPlayButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: AirPlayButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface AirPlayButtonState extends ButtonState {
  /** Current AirPlay connection state. */
  state: RemotePlaybackConnectionState;
  /** Whether AirPlay is available on the active platform and media. */
  availability: MediaFeatureAvailability;
}
export class AirPlayButtonCore {
  static readonly defaultProps: NonNullableObject<AirPlayButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<AirPlayButtonState>({
    state: 'disconnected',
    availability: 'unsupported',
    label: '',
  });

  #props = { ...AirPlayButtonCore.defaultProps };
  #media: MediaRemotePlaybackState | null = null;

  constructor(props?: AirPlayButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: AirPlayButtonProps): void {
    this.#props = defaults(props, AirPlayButtonCore.defaultProps);
  }

  getLabel(state: AirPlayButtonState): string {
    const label = resolveLabel(this.#props.label, state);
    if (label) return label;

    if (state.state === 'connected') return 'Stop AirPlay';
    if (state.state === 'connecting') return 'Connecting';
    return 'Start AirPlay';
  }

  getAttrs(state: AirPlayButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaRemotePlaybackState): void {
    this.#media = media;
  }

  getState(): AirPlayButtonState {
    const media = this.#media!;
    // WebKit (Safari macOS/iOS) is the only platform that surfaces AirPlay.
    // Mirrors the Chromium gate on CastButtonCore so each button only shows
    // on its supported platform.
    const isAirPlaySupported = supportsWebKitAirPlay();

    this.state.patch({
      state: media.remotePlaybackState,
      availability: isAirPlaySupported ? media.remotePlaybackAvailability : 'unsupported',
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

export namespace AirPlayButtonCore {
  export type Props = AirPlayButtonProps;
  export type State = AirPlayButtonState;
}
