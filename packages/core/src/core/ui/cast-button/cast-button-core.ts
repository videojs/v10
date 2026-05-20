import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';

/** Props for the cast button core. */
export interface CastButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CastButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the cast button core. */
export interface CastButtonState extends ButtonState {
  /** Current connection state to the remote playback receiver. */
  castState: RemotePlaybackConnectionState;
  /** Whether a cast receiver is available, or unsupported on this platform. */
  availability: MediaFeatureAvailability;
}

/** Behavior core for the cast button — surfaces remote playback state and toggles casting. */
export class CastButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<CastButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<CastButtonState>({
    castState: 'disconnected',
    availability: 'unsupported',
    label: '',
  });

  #props = { ...CastButtonCore.defaultProps };
  #media: MediaRemotePlaybackState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: CastButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: CastButtonProps): void {
    this.#props = defaults(props, CastButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
  getLabel(state: CastButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    if (state.castState === 'connected') return 'Stop casting';
    if (state.castState === 'connecting') return 'Connecting';
    return 'Start casting';
  }

  getAttrs(state: CastButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaRemotePlaybackState): void {
    this.#media = media;
  }

  getState(): CastButtonState {
    const media = this.#media!;
    const castSupported = !!(globalThis as any).chrome;

    this.state.patch({
      castState: media.remotePlaybackState,
      availability: castSupported ? media.remotePlaybackAvailability : 'unsupported',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Start or stop casting depending on current connection state (no-op when disabled or unavailable). */
  async toggle(media: MediaRemotePlaybackState): Promise<void> {
    if (this.#props.disabled) return;
    if (media.remotePlaybackAvailability !== 'available') return;

    try {
      await media.toggleRemotePlayback();
    } catch {
      // Cast requests can fail (user cancelled, permissions, etc.)
    }
  }
}

export namespace CastButtonCore {
  /** Alias for {@link CastButtonProps}. */
  export type Props = CastButtonProps;
  /** Alias for {@link CastButtonState}. */
  export type State = CastButtonState;
}
