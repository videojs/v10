import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction, isNull } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrack, MediaTextTrackState } from '../../media/state';
import type { ButtonState } from '../types';

export type CaptionsMenuTrackKind = 'captions' | 'subtitles';

export interface CaptionsMenuTrack extends MediaTextTrack<CaptionsMenuTrackKind> {
  index: number;
}

export interface CaptionsMenuProps {
  /** Custom label for the menu trigger. */
  label?: string | ((state: CaptionsMenuState) => string) | undefined;
  /** Custom formatter for visible text track labels. */
  formatTrack?: ((track: CaptionsMenuTrack) => string) | undefined;
  /** Custom label for the off option. */
  offLabel?: string | undefined;
  /**
   * Section title for the track list (radio group legend) and nested settings row / back button.
   * Also prefixes the default trigger label when `label` is not set.
   */
  menuSectionLabel?: string | undefined;
  /** Whether captions selection is disabled. */
  disabled?: boolean | undefined;
}

export interface CaptionsMenuState extends ButtonState {
  tracks: readonly CaptionsMenuTrack[];
  selectedTrackIndex: number | null;
  subtitlesShowing: boolean;
  availability: 'available' | 'unavailable';
  disabled: boolean;
}

const OFF_VALUE = 'off';

function isCaptionsTrack(track: MediaTextTrack): track is MediaTextTrack<CaptionsMenuTrackKind> {
  return track.kind === 'captions' || track.kind === 'subtitles';
}

function formatTextTrack(track: CaptionsMenuTrack): string {
  return track.label || track.language || (track.kind === 'captions' ? 'Captions' : 'Subtitles');
}

export class CaptionsMenuCore {
  static readonly defaultProps: NonNullableObject<CaptionsMenuProps> = {
    label: '',
    formatTrack: formatTextTrack,
    offLabel: 'Off',
    menuSectionLabel: 'Captions',
    disabled: false,
  };

  readonly state = createState<CaptionsMenuState>({
    tracks: [],
    selectedTrackIndex: null,
    subtitlesShowing: false,
    availability: 'unavailable',
    disabled: false,
    label: '',
  });

  #props = { ...CaptionsMenuCore.defaultProps };
  #media: MediaTextTrackState | null = null;

  constructor(props?: CaptionsMenuProps) {
    if (props) this.setProps(props);
  }

  setProps(props: CaptionsMenuProps): void {
    this.#props = defaults(props, CaptionsMenuCore.defaultProps);
  }

  getLabel(state: CaptionsMenuState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    const selectedTrack = this.getSelectedTrack(state);
    return `${this.getMenuSectionLabel()} ${selectedTrack ? this.getTrackLabel(selectedTrack) : this.getOffLabel()}`;
  }

  getMenuSectionLabel(): string {
    return this.#props.menuSectionLabel;
  }

  getOffLabel(): string {
    return this.#props.offLabel;
  }

  getTrackLabel(track: CaptionsMenuTrack): string {
    return this.#props.formatTrack(track);
  }

  getTrackValue(trackIndex: number | null): string {
    return isNull(trackIndex) ? OFF_VALUE : String(trackIndex);
  }

  getSelectedTrack(state: CaptionsMenuState): CaptionsMenuTrack | null {
    if (isNull(state.selectedTrackIndex)) return null;
    return state.tracks.find((track) => track.index === state.selectedTrackIndex) ?? null;
  }

  getAttrs(state: CaptionsMenuState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaTextTrackState): void {
    this.#media = media;
  }

  getState(): CaptionsMenuState {
    const media = this.#media!;
    const tracks = media.textTrackList.reduce<CaptionsMenuTrack[]>((items, track, index) => {
      if (isCaptionsTrack(track)) items.push({ ...track, index });
      return items;
    }, []);
    const selectedTrack = tracks.find((track) => track.mode === 'showing') ?? null;
    const availability: CaptionsMenuState['availability'] = tracks.length > 0 ? 'available' : 'unavailable';

    this.state.patch({
      tracks,
      selectedTrackIndex: selectedTrack?.index ?? null,
      subtitlesShowing: media.subtitlesShowing,
      availability,
      disabled: this.#props.disabled || availability === 'unavailable',
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  select(media: MediaTextTrackState, trackIndex: number | null): void {
    if (this.#props.disabled) return;

    if (!isNull(trackIndex)) {
      const track = media.textTrackList[trackIndex];
      if (!track || !isCaptionsTrack(track)) return;
    }

    media.selectTextTrack(trackIndex);
  }

  selectValue(media: MediaTextTrackState, value: string): void {
    if (value === OFF_VALUE) {
      this.select(media, null);
      return;
    }

    const trackIndex = Number(value);
    if (!Number.isInteger(trackIndex)) return;

    this.select(media, trackIndex);
  }
}

export namespace CaptionsMenuCore {
  export type Props = CaptionsMenuProps;
  export type State = CaptionsMenuState;
  export type Track = CaptionsMenuTrack;
}
