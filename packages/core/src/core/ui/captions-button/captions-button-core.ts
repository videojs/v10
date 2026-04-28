import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrackState } from '../../media/state';
import type { ButtonState } from '../types';

export interface CaptionsButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CaptionsButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

export interface CaptionsButtonState extends Pick<MediaTextTrackState, 'subtitlesShowing'>, ButtonState {
  /** Whether caption/subtitle tracks are present. */
  availability: 'available' | 'unavailable';
  /** Non-interactive but still focusable (mirrors `aria-disabled`). */
  disabled: boolean;
  /** Removed from the layout because no caption tracks are present. */
  hidden: boolean;
}

export class CaptionsButtonCore {
  static readonly defaultProps: NonNullableObject<CaptionsButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<CaptionsButtonState>({
    subtitlesShowing: false,
    availability: 'unavailable',
    // Hidden by default until tracks are reported; matches the derivation
    // invariants (`disabled = props.disabled || availability !== 'available'`,
    // `hidden = availability === 'unavailable'`).
    disabled: true,
    hidden: true,
    label: '',
  });

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
      'aria-disabled': state.disabled ? 'true' : undefined,
      hidden: state.hidden ? '' : undefined,
    };
  }

  setMedia(media: MediaTextTrackState): void {
    this.#media = media;
  }

  getState(): CaptionsButtonState {
    const media = this.#media!;
    const availability: CaptionsButtonState['availability'] = media.textTrackList.some(
      (t) => t.kind === 'captions' || t.kind === 'subtitles'
    )
      ? 'available'
      : 'unavailable';

    this.state.patch({
      subtitlesShowing: media.subtitlesShowing,
      availability,
      disabled: this.#props.disabled || availability !== 'available',
      hidden: availability === 'unavailable',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  toggle(media: MediaTextTrackState): void {
    this.setMedia(media);
    if (this.getState().disabled) return;
    media.toggleSubtitles();
  }
}

export namespace CaptionsButtonCore {
  export type Props = CaptionsButtonProps;
  export type State = CaptionsButtonState;
}
