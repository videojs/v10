import { createState } from '@videojs/store';
import { isCaptionOrSubtitleTrack } from '@videojs/utils/dom';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrackState } from '../../media/state';
import type { ButtonState } from '../types';
import { resolveLabel } from '../utils/resolve-label';

export interface CaptionsButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: CaptionsButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
  /** When true with multiple tracks, pointer activation opens a menu instead of toggling. React sets this automatically inside `Menu.Trigger`. */
  menuTrigger?: boolean | undefined;
}

export interface CaptionsButtonState extends Pick<MediaTextTrackState, 'subtitlesShowing'>, ButtonState {
  availability: 'available' | 'unavailable';
}

export class CaptionsButtonCore {
  static readonly defaultProps: NonNullableObject<CaptionsButtonProps> = {
    label: '',
    disabled: false,
    menuTrigger: false,
  };

  readonly state = createState<CaptionsButtonState>({
    subtitlesShowing: false,
    availability: 'unavailable',
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
    const label = resolveLabel(this.#props.label, state);
    if (label) return label;

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
    const availability: CaptionsButtonState['availability'] = media.textTrackList.some(isCaptionOrSubtitleTrack)
      ? 'available'
      : 'unavailable';

    this.state.patch({ subtitlesShowing: media.subtitlesShowing, availability });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  toggle(media: MediaTextTrackState): void {
    if (this.#props.disabled) return;
    if (this.#props.menuTrigger && getCaptionTrackCount(media) > 1) return;
    media.toggleSubtitles();
  }
}

function getCaptionTrackCount(media: MediaTextTrackState): number {
  return media.textTrackList.filter(isCaptionOrSubtitleTrack).length;
}

export namespace CaptionsButtonCore {
  export type Props = CaptionsButtonProps;
  export type State = CaptionsButtonState;
}
