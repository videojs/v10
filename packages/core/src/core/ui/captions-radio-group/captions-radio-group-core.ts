import { createState } from '@videojs/store';
import { isCaptionOrSubtitleTrack } from '@videojs/utils/dom';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrack, MediaTextTrackState } from '../../media/state';
import type { ButtonState } from '../types';

export interface CaptionsRadioGroupProps {
  /** Custom label for the menu trigger. */
  label?: string | ((state: CaptionsRadioGroupState) => string) | undefined;
  /** Custom formatter for visible track labels. */
  formatTrack?: ((track: MediaTextTrack) => string) | undefined;
  /** Whether track selection is disabled. */
  disabled?: boolean | undefined;
}

export interface CaptionsRadioGroupTrack {
  value: string;
  label: string;
}

export interface CaptionsRadioGroupState extends Pick<MediaTextTrackState, 'subtitlesShowing'>, ButtonState {
  tracks: readonly CaptionsRadioGroupTrack[];
  value: string;
  disabled: boolean;
  availability: 'available' | 'unavailable';
}

export const CAPTIONS_OFF_VALUE = 'off';

function formatTrackLabel(track: MediaTextTrack): string {
  if (track.label) return track.label;
  if (track.language) return track.language;
  return track.kind === 'captions' ? 'Captions' : 'Subtitles';
}

function sortCaptionTracks(a: MediaTextTrack, b: MediaTextTrack): number {
  return a.kind > b.kind ? 1 : a.kind < b.kind ? -1 : 0;
}

function getCaptionTracks(textTrackList: readonly MediaTextTrack[]): MediaTextTrack[] {
  return textTrackList.filter(isCaptionOrSubtitleTrack).sort(sortCaptionTracks);
}

export class CaptionsRadioGroupCore {
  static readonly defaultProps: NonNullableObject<CaptionsRadioGroupProps> = {
    label: '',
    formatTrack: formatTrackLabel,
    disabled: false,
  };

  readonly state = createState<CaptionsRadioGroupState>({
    tracks: [],
    value: CAPTIONS_OFF_VALUE,
    subtitlesShowing: false,
    disabled: false,
    availability: 'unavailable',
    label: '',
  });

  #props = { ...CaptionsRadioGroupCore.defaultProps };
  #media: MediaTextTrackState | null = null;

  constructor(props?: CaptionsRadioGroupProps) {
    if (props) this.setProps(props);
  }

  setProps(props: CaptionsRadioGroupProps): void {
    this.#props = defaults(props, CaptionsRadioGroupCore.defaultProps);
  }

  getLabel(state: CaptionsRadioGroupState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return state.subtitlesShowing ? 'Disable captions' : 'Enable captions';
  }

  getTrackLabel(track: MediaTextTrack): string {
    return this.#props.formatTrack(track);
  }

  getAttrs(state: CaptionsRadioGroupState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaTextTrackState): void {
    this.#media = media;
  }

  getState(): CaptionsRadioGroupState {
    const media = this.#media!;
    const captionTracks = getCaptionTracks(media.textTrackList);
    const showingIndex = captionTracks.findIndex((track) => track.mode === 'showing');
    const tracks = captionTracks.map((track, index) => ({
      value: track.id || String(index),
      label: this.getTrackLabel(track),
    }));

    const availability: CaptionsRadioGroupState['availability'] =
      captionTracks.length > 0 ? 'available' : 'unavailable';

    this.state.patch({
      tracks,
      value: showingIndex === -1 ? CAPTIONS_OFF_VALUE : captionTracks[showingIndex]!.id || String(showingIndex),
      subtitlesShowing: media.subtitlesShowing,
      disabled: this.#props.disabled || captionTracks.length === 0,
      availability,
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  select(media: MediaTextTrackState, value: string): void {
    if (this.#props.disabled) return;

    const captionTracks = getCaptionTracks(media.textTrackList);
    if (!captionTracks.length) return;

    if (value === CAPTIONS_OFF_VALUE) {
      media.selectSubtitlesTrack(CAPTIONS_OFF_VALUE);
      return;
    }

    if (!captionTracks.some((track, index) => (track.id || String(index)) === value)) return;

    media.selectSubtitlesTrack(value);
  }

  selectValue(media: MediaTextTrackState, value: string): void {
    this.select(media, value);
  }
}

export namespace CaptionsRadioGroupCore {
  export type Props = CaptionsRadioGroupProps;
  export type State = CaptionsRadioGroupState;
}
