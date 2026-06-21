import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { SliderCore, type SliderState } from '../slider/slider-core';
import { TIME_SLIDER_DEFAULT_PROPS, type TimeSliderProps } from './props';

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

/** Time-domain slider: maps media time/buffer state to slider state. */
export class TimeSliderCore extends SliderCore {
  static override readonly defaultProps = TIME_SLIDER_DEFAULT_PROPS;

  #props = { ...TimeSliderCore.defaultProps };
  #media: (MediaTimeState & MediaBufferState) | null = null;

  constructor(props?: TimeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: TimeSliderProps): void {
    this.#props = defaults(props, TimeSliderCore.defaultProps);
    super.setProps({ ...props, min: 0 });
  }

  setMedia(media: MediaTimeState & MediaBufferState): void {
    this.#media = media;
  }

  getState(): TimeSliderState {
    const media = this.#media!;
    const { duration, currentTime, seeking, buffered } = media;

    // Override min/max for time domain, forwarding all user props so disabled/thumbAlignment aren't lost.
    super.setProps({ ...this.#props, min: 0, max: duration });

    const base = super.getSliderState(currentTime);

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

    // During drag, announce the pointer position the user would seek to.
    const announceValue = state.dragging ? this.rawValueFromPercent(state.pointerPercent) : state.value;
    const currentPhrase = formatTimeAsPhrase(announceValue);
    const durationPhrase = formatTimeAsPhrase(state.duration);
    const valuetext = durationPhrase ? `${currentPhrase} of ${durationPhrase}` : currentPhrase;

    return {
      ...base,
      'aria-valuenow': announceValue,
      'aria-valuetext': valuetext,
    };
  }
}

export namespace TimeSliderCore {
  export type Props = TimeSliderProps;
  export type State = TimeSliderState;
}

export type { TimeSliderProps } from './props';
