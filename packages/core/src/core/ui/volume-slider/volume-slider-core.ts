import { defaults } from '@videojs/utils/object';
import { formatPercent } from '@videojs/utils/percent';
import type { NonNullableObject } from '@videojs/utils/types';
import type { MediaVolumeState } from '../../media/state';
import type { MediaFeatureAvailability } from '../../media/types';
import { SliderCore, type SliderProps, type SliderState } from '../slider/slider-core';

export interface VolumeSliderProps extends SliderProps {
  /** Step increment for wheel scrolling. */
  wheelStep?: number | undefined;
  /** @internal Derived from `volume` (0–100) — not user-settable. */
  value?: number | undefined;
  /** @internal Always 0 — not user-settable. */
  min?: number | undefined;
  /** @internal Always 100 — not user-settable. */
  max?: number | undefined;
}

export interface VolumeSliderState extends SliderState, Pick<MediaVolumeState, 'volume' | 'muted'> {
  availability: MediaFeatureAvailability;
}

/** Volume-domain slider: maps media volume/mute state to slider state. */
export class VolumeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<VolumeSliderProps> = {
    ...SliderCore.defaultProps,
    label: '',
    wheelStep: 5,
  };

  #media: MediaVolumeState | null = null;
  #formatLocale: string | string[] | undefined;

  constructor(props?: VolumeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: VolumeSliderProps): void {
    super.setProps(defaults(props, VolumeSliderCore.defaultProps));
  }

  setMedia(media: MediaVolumeState): void {
    this.#media = media;
  }

  /** @internal Platform adapters set the active i18n locale for `aria-valuetext` percent formatting. */
  setFormatLocale(locale: string | string[] | undefined): void {
    this.#formatLocale = locale;
  }

  getState(): VolumeSliderState {
    const media = this.#media!;
    const { volume, muted } = media;
    const effectivelyMuted = muted || volume === 0;
    const { dragging, dragPercent } = this.input;
    const volumePercent = volume * 100;
    const value = dragging ? this.valueFromPercent(dragPercent) : volumePercent;
    const base = super.getSliderState(value);

    return {
      ...base,
      fillPercent: effectivelyMuted ? 0 : base.fillPercent,
      volume,
      muted: effectivelyMuted,
      availability: media.volumeAvailability,
    };
  }

  /** Wheel step as a percentage of the slider range. */
  getWheelStepPercent(): number {
    const props = this.props as NonNullableObject<VolumeSliderProps>;
    const range = props.max - props.min;
    return range > 0 ? (props.wheelStep / range) * 100 : 0;
  }

  override getLabel(state: SliderState): string {
    return super.getLabel(state) || 'Volume';
  }

  getValueText(state: VolumeSliderState): string {
    return state.muted ? '{percent}, muted' : this.getValueTextParams(state).percent;
  }

  getValueTextParams(state: VolumeSliderState): { percent: string } {
    return { percent: formatPercent(state.value / 100, this.#formatLocale) };
  }

  override getAttrs(state: VolumeSliderState) {
    const base = super.getAttrs(state);

    return {
      ...base,
      'aria-valuetext': this.getValueText(state),
    };
  }
}

export namespace VolumeSliderCore {
  export type Props = VolumeSliderProps;
  export type State = VolumeSliderState;
}
