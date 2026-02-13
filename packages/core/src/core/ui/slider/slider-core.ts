import { clamp, roundToStep } from '@videojs/utils/number';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

export interface SliderProps {
  /** Minimum value of the slider range. */
  min?: number | undefined;
  /** Maximum value of the slider range. */
  max?: number | undefined;
  /** Step increment for value changes (arrow keys). */
  step?: number | undefined;
  /** Large step increment (Page Up/Down keys). */
  largeStep?: number | undefined;
  /** Axis of slider movement. */
  orientation?: 'horizontal' | 'vertical' | undefined;
  /** Whether the slider is non-interactive. */
  disabled?: boolean | undefined;
  /** How the thumb aligns at the track edges. `edge` constrains the thumb within track bounds. */
  thumbAlignment?: 'center' | 'edge' | undefined;
}

/** Current pointer/drag interaction state, typically provided by a DOM controller. */
export interface SliderInteraction {
  /** Pointer position as a percentage of the track (0–100). */
  pointerPercent: number;
  /** Drag position as a percentage of the track (0–100). */
  dragPercent: number;
  /** Whether the user is actively dragging. */
  dragging: boolean;
  /** Whether the pointer is over the slider. */
  pointing: boolean;
  /** Whether the slider has keyboard focus. */
  focused: boolean;
}

export interface SliderState {
  /** Current slider value in the min–max range. */
  value: number;
  /** Fill level as a percentage (0–100), derived from value. */
  fillPercent: number;
  /** Pointer position as a percentage of the track (0–100). */
  pointerPercent: number;
  /** Whether the user is actively dragging. */
  dragging: boolean;
  /** Whether the pointer is over the slider. */
  pointing: boolean;
  /** Whether dragging or pointing is active. */
  interactive: boolean;
  /** Axis of slider movement. */
  orientation: 'horizontal' | 'vertical';
  /** Whether the slider is non-interactive. */
  disabled: boolean;
  /** How the thumb aligns at the track edges. */
  thumbAlignment: 'center' | 'edge';
}

export class SliderCore {
  static readonly defaultProps: NonNullableObject<SliderProps> = {
    min: 0,
    max: 100,
    step: 1,
    largeStep: 10,
    orientation: 'horizontal',
    disabled: false,
    thumbAlignment: 'center',
  };

  #props = { ...SliderCore.defaultProps };

  constructor(props?: SliderProps) {
    if (props) this.setProps(props);
  }

  setProps(props: SliderProps): void {
    this.#props = defaults(props, SliderCore.defaultProps);
  }

  getState(interaction: SliderInteraction, value: number): SliderState {
    const { orientation, disabled, thumbAlignment } = this.#props;

    return {
      value,
      fillPercent: this.percentFromValue(value),
      pointerPercent: interaction.pointerPercent,
      dragging: interaction.dragging,
      pointing: interaction.pointing,
      interactive: interaction.dragging || interaction.pointing || interaction.focused,
      orientation,
      disabled,
      thumbAlignment,
    };
  }

  getAttrs(state: SliderState) {
    return {
      role: 'slider',
      tabindex: state.disabled ? -1 : 0,
      autocomplete: 'off',
      'aria-valuemin': this.#props.min,
      'aria-valuemax': this.#props.max,
      'aria-valuenow': state.value,
      'aria-orientation': state.orientation,
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  valueFromPercent(percent: number): number {
    const { min, max, step } = this.#props;
    const raw = min + (percent / 100) * (max - min);
    return roundToStep(clamp(raw, min, max), step, min);
  }

  percentFromValue(value: number): number {
    const { min, max } = this.#props;
    if (max === min) return 0;
    return ((value - min) / (max - min)) * 100;
  }

  adjustPercentForAlignment(rawPercent: number, thumbSize: number, trackSize: number): number {
    if (this.#props.thumbAlignment === 'center' || trackSize === 0) {
      return rawPercent;
    }

    const thumbHalf = ((thumbSize / trackSize) * 100) / 2;
    const minPercent = thumbHalf;
    const maxPercent = 100 - thumbHalf;
    return minPercent + (rawPercent / 100) * (maxPercent - minPercent);
  }
}

export namespace SliderCore {
  export type Props = SliderProps;
  export type State = SliderState;
  export type Interaction = SliderInteraction;
}
