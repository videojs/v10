import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaVolumeState } from '../../media/state';
import { type SliderBaseProps, SliderCore, type SliderInteraction, type SliderState } from '../slider/slider-core';

export interface VolumeSliderProps extends SliderBaseProps {}

export interface VolumeSliderState extends SliderState, Pick<MediaVolumeState, 'volume' | 'muted'> {}

// @ts-expect-error — defaultProps shape differs from base (domain sliders omit value/min/max)
export class VolumeSliderCore extends SliderCore {
  static readonly defaultProps: NonNullableObject<VolumeSliderProps> = {
    label: 'Volume',
    step: SliderCore.defaultProps.step,
    largeStep: SliderCore.defaultProps.largeStep,
    orientation: SliderCore.defaultProps.orientation,
    disabled: SliderCore.defaultProps.disabled,
    thumbAlignment: SliderCore.defaultProps.thumbAlignment,
  };

  constructor(props?: VolumeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: VolumeSliderProps): void {
    super.setProps(defaults(props, VolumeSliderCore.defaultProps));
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

  override getLabel(state: SliderState): string {
    return super.getLabel(state) || 'Volume';
  }

  override getAttrs(state: VolumeSliderState) {
    const base = super.getAttrs(state);
    const valuetext = `${Math.round(state.value)} percent${state.muted ? ', muted' : ''}`;

    return {
      ...base,
      'aria-valuetext': valuetext,
    };
  }
}

export namespace VolumeSliderCore {
  export type Props = VolumeSliderProps;
  export type State = VolumeSliderState;
}
