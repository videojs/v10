import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaVolumeState } from '../../media/state';
import { type SliderBaseProps, SliderCore, type SliderState } from '../slider/slider-core';

export interface VolumeSliderProps extends SliderBaseProps {}

export interface VolumeSliderState extends SliderState, Pick<MediaVolumeState, 'volume' | 'muted'> {}

export class VolumeSliderCore extends SliderCore {
  static override readonly defaultBaseProps: NonNullableObject<VolumeSliderProps> = {
    label: 'Volume',
    step: SliderCore.defaultBaseProps.step,
    largeStep: SliderCore.defaultBaseProps.largeStep,
    orientation: SliderCore.defaultBaseProps.orientation,
    disabled: SliderCore.defaultBaseProps.disabled,
    thumbAlignment: SliderCore.defaultBaseProps.thumbAlignment,
  };

  constructor(props?: VolumeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: VolumeSliderProps): void {
    super.setProps(defaults(props, VolumeSliderCore.defaultBaseProps));
  }

  getState(media: MediaVolumeState): VolumeSliderState {
    const { volume, muted } = media;
    const { dragging, dragPercent } = this.input;
    const volumePercent = volume * 100;
    const value = dragging ? this.valueFromPercent(dragPercent) : volumePercent;
    const base = super.getSliderState(value);

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
