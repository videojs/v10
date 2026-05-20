import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaFullscreenState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the fullscreen button core. */
export interface FullscreenButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: FullscreenButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the fullscreen button core. */
export interface FullscreenButtonState extends Pick<MediaFullscreenState, 'fullscreen'>, ButtonState {
  /** Whether fullscreen can be requested on this platform. */
  availability: MediaFullscreenState['fullscreenAvailability'];
}

/** Behavior core for the fullscreen button — derives label and toggles fullscreen. */
export class FullscreenButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<FullscreenButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<FullscreenButtonState>({
    fullscreen: false,
    availability: 'available',
    label: '',
  });

  #props = { ...FullscreenButtonCore.defaultProps };
  #media: MediaFullscreenState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: FullscreenButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: FullscreenButtonProps): void {
    this.#props = defaults(props, FullscreenButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
  getLabel(state: FullscreenButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
  }

  getAttrs(state: FullscreenButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaFullscreenState): void {
    this.#media = media;
  }

  getState(): FullscreenButtonState {
    const media = this.#media!;
    this.state.patch({ fullscreen: media.fullscreen, availability: media.fullscreenAvailability });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Enter or exit fullscreen depending on current state (no-op when disabled or unavailable). */
  async toggle(media: MediaFullscreenState): Promise<void> {
    if (this.#props.disabled) return;
    if (media.fullscreenAvailability !== 'available') return;

    try {
      if (media.fullscreen) {
        await media.exitFullscreen();
      } else {
        await media.requestFullscreen();
      }
    } catch {
      // Fullscreen requests can fail (user gesture required, permissions, etc.)
    }
  }
}

export namespace FullscreenButtonCore {
  /** Alias for {@link FullscreenButtonProps}. */
  export type Props = FullscreenButtonProps;
  /** Alias for {@link FullscreenButtonState}. */
  export type State = FullscreenButtonState;
}
