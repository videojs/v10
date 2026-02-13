import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { SliderCore, type SliderInteraction, type SliderProps, type SliderState } from './slider-core';

export interface TimeSliderProps extends SliderProps {
  /** Accessible label for the slider. */
  label?: string | undefined;
}

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

export class TimeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<TimeSliderProps> = {
    ...SliderCore.defaultProps,
    label: 'Seek',
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

    // Override min/max for time domain
    super.setProps({ min: 0, max: duration, step: this.#props.step, largeStep: this.#props.largeStep });

    const value = interaction.dragging ? this.valueFromPercent(interaction.dragPercent) : currentTime;
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

  override getAttrs(state: TimeSliderState) {
    const base = super.getAttrs(state);
    const currentPhrase = formatTimeAsPhrase(state.value);
    const durationPhrase = formatTimeAsPhrase(state.duration);
    const valuetext = durationPhrase ? `${currentPhrase} of ${durationPhrase}` : currentPhrase;

    return {
      ...base,
      'aria-label': this.#props.label,
      'aria-valuetext': valuetext,
    };
  }
}

export namespace TimeSliderCore {
  export type Props = TimeSliderProps;
  export type State = TimeSliderState;
}
