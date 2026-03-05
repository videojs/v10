import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrackState } from '../../media/state';

export interface CaptionsButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CaptionsButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface CaptionsButtonState extends Pick<MediaTextTrackState, 'subtitlesShowing'> {
  availability: 'available' | 'unavailable';
}

export class CaptionsButtonCore {
  static readonly defaultProps: NonNullableObject<CaptionsButtonProps> = {
    label: '',
    disabled: false,
  };

  #props = { ...CaptionsButtonCore.defaultProps };
  #media: MediaTextTrackState | null = null;

  constructor(props?: CaptionsButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: CaptionsButtonProps): void {
    this.#props = defaults(props, CaptionsButtonCore.defaultProps);
  }

  getLabel(state: CaptionsButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.subtitlesShowing ? 'Disable captions' : 'Enable captions';
  }

  getAttrs(state: CaptionsButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaTextTrackState): void {
    this.#media = media;
  }

  getState(): CaptionsButtonState {
    const media = this.#media!;
    return {
      subtitlesShowing: media.subtitlesShowing,
      availability: media.subtitlesList.length > 0 ? 'available' : 'unavailable',
    };
  }

  toggle(media: MediaTextTrackState): void {
    if (this.#props.disabled) return;
    media.toggleSubtitles();
  }
}

export namespace CaptionsButtonCore {
  export type Props = CaptionsButtonProps;
  export type State = CaptionsButtonState;
}
