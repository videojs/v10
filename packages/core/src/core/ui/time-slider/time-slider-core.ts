import { clamp } from '@videojs/utils/number';
import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { type SliderBaseProps, SliderCore, type SliderInteraction, type SliderState } from '../slider/slider-core';

export interface TimeSliderProps extends SliderBaseProps {
  /** Trailing-edge throttle (ms) for seek requests during drag. */
  commitThrottle?: number | undefined;
}

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

// @ts-expect-error — defaultProps shape differs from base (domain sliders omit value/min/max)
export class TimeSliderCore extends SliderCore {
  static readonly defaultProps: NonNullableObject<TimeSliderProps> = {
    step: SliderCore.defaultProps.step,
    largeStep: SliderCore.defaultProps.largeStep,
    orientation: SliderCore.defaultProps.orientation,
    disabled: SliderCore.defaultProps.disabled,
    thumbAlignment: SliderCore.defaultProps.thumbAlignment,
    label: 'Seek',
    commitThrottle: 100,
  };

  #props = { ...TimeSliderCore.defaultProps };

  constructor(props?: TimeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: TimeSliderProps): void {
    this.#props = defaults(props, TimeSliderCore.defaultProps);
    super.setProps({ ...props, min: 0 });
  }

  getTimeState(media: MediaTimeState & MediaBufferState, interaction: SliderInteraction): TimeSliderState {
    const { duration, currentTime, seeking, buffered } = media;

    // Override min/max for time domain, forwarding all user props so disabled/thumbAlignment aren't lost.
    super.setProps({ ...this.#props, min: 0, max: duration });

    // Raw precision during drag for smooth scrubbing — step snapping only applies to keyboard.
    const value = interaction.dragging ? clamp((interaction.dragPercent / 100) * duration, 0, duration) : currentTime;
    const base = super.getState(interaction, value);

    // Use end of the furthest buffered range
    const bufferedEnd = buffered.length > 0 ? buffered[buffered.length - 1]![1] : 0;
    const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

    return {
      ...base,
      currentTime,
      duration,
      seeking,
      bufferPercent,
    };
  }

  override getLabel(state: SliderState): string {
    return super.getLabel(state) || 'Seek';
  }

  override getAttrs(state: TimeSliderState) {
    const base = super.getAttrs(state);
    const currentPhrase = formatTimeAsPhrase(state.value);
    const durationPhrase = formatTimeAsPhrase(state.duration);
    const valuetext = durationPhrase ? `${currentPhrase} of ${durationPhrase}` : currentPhrase;

    return {
      ...base,
      'aria-valuetext': valuetext,
    };
  }
}

export namespace TimeSliderCore {
  export type Props = TimeSliderProps;
  export type State = TimeSliderState;
}
