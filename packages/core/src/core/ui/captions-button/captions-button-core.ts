import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrackState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the captions button core. */
export interface CaptionsButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CaptionsButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the captions button core. */
export interface CaptionsButtonState extends Pick<MediaTextTrackState, 'subtitlesShowing'>, ButtonState {
  /** `available` when at least one captions or subtitles track exists. */
  availability: 'available' | 'unavailable';
}

/** Behavior core for the captions button — derives availability and toggles subtitle visibility. */
export class CaptionsButtonCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<CaptionsButtonProps> = {
    label: '',
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<CaptionsButtonState>({
    subtitlesShowing: false,
    availability: 'unavailable',
    label: '',
  });

  #props = { ...CaptionsButtonCore.defaultProps };
  #media: MediaTextTrackState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: CaptionsButtonProps) {
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  setProps(props: CaptionsButtonProps): void {
    this.#props = defaults(props, CaptionsButtonCore.defaultProps);
  }

  /** Resolve the button's ARIA label from props and state. */
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

  /** Compute ARIA attributes from state. */
  getAttrs(state: CaptionsButtonState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': this.#props.disabled ? 'true' : undefined,
    };
  }

  /** Bind the core to a media text track state source. */
  setMedia(media: MediaTextTrackState): void {
    this.#media = media;
  }

  /** Recompute and return the current state. */
  getState(): CaptionsButtonState {
    const media = this.#media!;
    const availability: CaptionsButtonState['availability'] = media.textTrackList.some(
      (t) => t.kind === 'captions' || t.kind === 'subtitles'
    )
      ? 'available'
      : 'unavailable';

    this.state.patch({ subtitlesShowing: media.subtitlesShowing, availability });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Toggle subtitle visibility on the media (no-op when disabled). */
  toggle(media: MediaTextTrackState): void {
    if (this.#props.disabled) return;
    media.toggleSubtitles();
  }
}

export namespace CaptionsButtonCore {
  /** Alias for {@link CaptionsButtonProps}. */
  export type Props = CaptionsButtonProps;
  /** Alias for {@link CaptionsButtonState}. */
  export type State = CaptionsButtonState;
}
