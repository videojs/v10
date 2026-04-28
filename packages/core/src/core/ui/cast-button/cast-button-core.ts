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
  /** Current cast connection state (`disconnected`, `connecting`, or `connected`). */
  castState: RemotePlaybackConnectionState;
  /** Whether casting is `available` (a device is reachable), `unavailable` (no device), or `unsupported`. */
  availability: MediaFeatureAvailability;
  /** Non-interactive but still focusable (mirrors `aria-disabled`). */
  disabled: boolean;
  /** Removed from the layout because the feature is unsupported. */
  hidden: boolean;
}

export class CastButtonCore {
  static readonly defaultProps: NonNullableObject<CastButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<CastButtonState>({
    castState: 'disconnected',
    availability: 'unavailable',
    // No cast device available yet — derived `disabled` matches the invariant
    // `disabled = props.disabled || availability !== 'available'`.
    disabled: true,
    hidden: false,
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
      'aria-disabled': state.disabled ? 'true' : undefined,
      hidden: state.hidden ? '' : undefined,
    };
  }

  setMedia(media: MediaRemotePlaybackState): void {
    this.#media = media;
  }

  getState(): CastButtonState {
    const media = this.#media!;
    const availability = media.remotePlaybackAvailability;

    this.state.patch({
      castState: media.remotePlaybackState,
      availability,
      disabled: this.#props.disabled || availability !== 'available',
      hidden: availability === 'unsupported',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  async toggle(media: MediaRemotePlaybackState): Promise<void> {
    this.setMedia(media);
    if (this.getState().disabled) return;
    return media.toggleRemotePlayback();
  }
}

export namespace CastButtonCore {
  export type Props = CastButtonProps;
  export type State = CastButtonState;
}
