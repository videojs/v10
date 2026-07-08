import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaAudioTrack, MediaAudioTrackState } from '../../media/state';
import type { ButtonState } from '../types';
import { resolveLabel } from '../utils/resolve-label';

export interface AudioTrackRadioGroupProps {
  /** Custom label for the options group. */
  label?: string | ((state: AudioTrackRadioGroupState) => string) | undefined;
  /** Custom formatter for visible track labels. */
  formatTrack?: ((track: MediaAudioTrack) => string) | undefined;
  /** Whether audio track selection is disabled. */
  disabled?: boolean | undefined;
}

export interface AudioTrackRadioGroupTrack {
  value: string;
  label: string;
}

export interface AudioTrackRadioGroupState extends ButtonState {
  tracks: readonly AudioTrackRadioGroupTrack[];
  value: string;
  disabled: boolean;
  availability: 'available' | 'unavailable';
}

function formatTrackLabel(track: MediaAudioTrack): string {
  if (track.label) return track.label;
  if (track.language) return track.language;
  if (track.kind) return track.kind;
  return 'Audio';
}

function getTrackValue(track: MediaAudioTrack, index: number): string {
  return track.id || String(index);
}

export class AudioTrackRadioGroupCore {
  static readonly defaultProps: NonNullableObject<AudioTrackRadioGroupProps> = {
    label: '',
    formatTrack: formatTrackLabel,
    disabled: false,
  };

  readonly state = createState<AudioTrackRadioGroupState>({
    tracks: [],
    value: '',
    disabled: false,
    availability: 'unavailable',
    label: '',
  });

  #props = { ...AudioTrackRadioGroupCore.defaultProps };
  #media: MediaAudioTrackState | null = null;

  constructor(props?: AudioTrackRadioGroupProps) {
    if (props) this.setProps(props);
  }

  setProps(props: AudioTrackRadioGroupProps): void {
    this.#props = defaults(props, AudioTrackRadioGroupCore.defaultProps);
  }

  getLabel(state: AudioTrackRadioGroupState): string {
    const label = resolveLabel(this.#props.label, state);
    if (label) return label;

    return 'Audio';
  }

  getTrackLabel(track: MediaAudioTrack): string {
    return this.#props.formatTrack(track);
  }

  getAttrs(state: AudioTrackRadioGroupState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaAudioTrackState): void {
    this.#media = media;
  }

  getState(): AudioTrackRadioGroupState {
    const media = this.#media!;
    const enabledIndex = media.audioTrackList.findIndex((track) => track.enabled);
    const tracks = media.audioTrackList.map((track, index) => ({
      value: getTrackValue(track, index),
      label: this.getTrackLabel(track),
    }));
    const availability: AudioTrackRadioGroupState['availability'] = tracks.length > 1 ? 'available' : 'unavailable';

    this.state.patch({
      tracks,
      value: enabledIndex === -1 ? '' : getTrackValue(media.audioTrackList[enabledIndex]!, enabledIndex),
      disabled: this.#props.disabled || availability === 'unavailable',
      availability,
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  select(media: MediaAudioTrackState, value: string): void {
    if (this.#props.disabled) return;

    const hasValue = media.audioTrackList.some((track, index) => getTrackValue(track, index) === value);
    if (!hasValue) return;

    media.selectAudioTrack(value);
  }

  selectValue(media: MediaAudioTrackState, value: string): void {
    this.select(media, value);
  }
}

export namespace AudioTrackRadioGroupCore {
  export type Props = AudioTrackRadioGroupProps;
  export type State = AudioTrackRadioGroupState;
}
