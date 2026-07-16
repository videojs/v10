import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';
import { resolveText, type Text } from '../../i18n';
import { connectingText, startText, stopText } from '../../i18n/text/cast';
import type { MediaRemotePlaybackState, RemotePlaybackConnectionState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';
import { resolveLabel } from '../utils/resolve-label';

export interface CastButtonProps {
  /** Custom label for the button. */
  label?: Text | string | ((state: CastButtonState) => Text | string) | undefined;
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
    availability: 'unsupported',
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

  getLabel(state: CastButtonState): Text | string {
    const label = resolveLabel(this.#props.label, state);
    if (label) return label;

    if (state.castState === 'connected') return stopText;
    if (state.castState === 'connecting') return connectingText;
    return startText;
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
    this.state.patch({ label: resolveText(this.getLabel(this.state.current)) });

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
