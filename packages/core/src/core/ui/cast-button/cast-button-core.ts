import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { CastState, MediaCastState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import type { ButtonState } from '../types';

export interface CastButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CastButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface CastButtonState extends ButtonState {
  /** Current cast connection state. */
  castState: CastState;
  /** Whether casting can be requested on this platform. */
  availability: MediaFeatureAvailability;
  /** Whether the button is non-interactive (explicitly disabled or feature not available). */
  disabled: boolean;
  /** Whether the button is hidden because the feature is unsupported. */
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
    disabled: true,
    hidden: false,
    label: '',
  });

  #props = { ...CastButtonCore.defaultProps };
  #media: MediaCastState | null = null;

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
      'aria-disabled': state.disabled || state.hidden ? 'true' : undefined,
      hidden: state.hidden || undefined,
    };
  }

  setMedia(media: MediaCastState): void {
    this.#media = media;
  }

  getState(): CastButtonState {
    const media = this.#media!;
    const availability = media.castAvailability;
    const disabled = this.#props.disabled || availability !== 'available';
    const hidden = availability === 'unsupported';
    this.state.patch({ castState: media.castState, availability, disabled, hidden });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  async toggle(media: MediaCastState): Promise<void> {
    if (this.#props.disabled) return;
    if (media.castAvailability !== 'available') return;

    try {
      await media.toggleCast();
    } catch {
      // Cast requests can fail (user cancelled, permissions, etc.)
    }
  }
}

export namespace CastButtonCore {
  export type Props = CastButtonProps;
  export type State = CastButtonState;
}
