import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';

export interface CastButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CastButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface CastButtonState extends ButtonState {
  castState: RemotePlaybackConnectionState;
  availability: MediaFeatureAvailability;
}

export class CastButtonCore {
  static readonly defaultProps: NonNullableObject<CastButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<CastButtonState>({
    castState: 'disconnected',
    availability: 'unavailable',
    label: '',
  });

  #props = { ...CastButtonCore.defaultProps };
  #media: MediaRemotePlaybackState | null = null;

  constructor(props?: CastButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: CastButtonProps): void {
    this.#props = defaults(props, CastButtonCore.defaultProps);
  }

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

    this.state.patch({
      castState: media.remotePlaybackState,
      availability: media.remotePlaybackAvailability,
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

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
  export type Props = CastButtonProps;
  export type State = CastButtonState;
}
