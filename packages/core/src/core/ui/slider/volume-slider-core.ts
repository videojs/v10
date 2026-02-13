import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaVolumeState } from '../../media/state';
import { SliderCore, type SliderInteraction, type SliderProps, type SliderState } from './slider-core';

export interface VolumeSliderProps extends SliderProps {
  /** Accessible label for the slider. */
  label?: string | undefined;
}

export interface VolumeSliderState extends SliderState, Pick<MediaVolumeState, 'volume' | 'muted'> {}

export class VolumeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<VolumeSliderProps> = {
    ...SliderCore.defaultProps,
    label: 'Volume',
  };

  #props = { ...VolumeSliderCore.defaultProps };

  constructor(props?: VolumeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: VolumeSliderProps): void {
    this.#props = defaults(props, VolumeSliderCore.defaultProps);
    super.setProps(props);
  }

  getVolumeState(media: MediaVolumeState, interaction: SliderInteraction): VolumeSliderState {
    const { volume, muted } = media;
    const volumePercent = volume * 100;
    const value = interaction.dragging ? this.valueFromPercent(interaction.dragPercent) : volumePercent;
    const base = super.getState(interaction, value);

    return {
      ...base,
      fillPercent: muted ? 0 : base.fillPercent,
      volume,
      muted,
    };
  }

  override getAttrs(state: VolumeSliderState) {
    const base = super.getAttrs(state);
    const valuetext = `${Math.round(state.value)} percent${state.muted ? ', muted' : ''}`;

    return {
      ...base,
      'aria-label': this.#props.label,
      'aria-valuetext': valuetext,
    };
  }
}

export namespace VolumeSliderCore {
  export type Props = VolumeSliderProps;
  export type State = VolumeSliderState;
}
