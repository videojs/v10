import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaFullscreenState } from '../../media/state';
import { resolveOptionalControlLabel } from '../resolve-optional-control-label';
import type { ButtonState, TranslationKeyOrString } from '../types';

export interface FullscreenButtonProps {
  /** Custom label for the button. */
  label?: TranslationKeyOrString | ((state: FullscreenButtonState) => TranslationKeyOrString) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface FullscreenButtonState extends Pick<MediaFullscreenState, 'fullscreen'>, ButtonState {
  /** Whether fullscreen can be requested on this platform. */
  availability: MediaFullscreenState['fullscreenAvailability'];
}

export class FullscreenButtonCore {
  static readonly defaultProps: NonNullableObject<FullscreenButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<FullscreenButtonState>({
    fullscreen: false,
    availability: 'available',
    label: '',
  });

  #props = { ...FullscreenButtonCore.defaultProps };
  #media: MediaFullscreenState | null = null;

  constructor(props?: FullscreenButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: FullscreenButtonProps): void {
    this.#props = defaults(props, FullscreenButtonCore.defaultProps);
  }

  getLabel(state: FullscreenButtonState): TranslationKeyOrString {
    const custom = resolveOptionalControlLabel(this.#props.label, state);
    if (custom !== undefined) return custom;

    return state.fullscreen ? 'exitFullscreen' : 'enterFullscreen';
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
  export type Props = FullscreenButtonProps;
  export type State = FullscreenButtonState;
}
