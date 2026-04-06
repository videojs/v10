import { clamp } from '@videojs/utils/number';
import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { SliderCore, type SliderProps, type SliderState } from '../slider/slider-core';

export interface TimeSliderProps extends SliderProps {
  /** @internal Derived from `currentTime` — not user-settable. */
  value?: number | undefined;
  /** @internal Always 0 — not user-settable. */
  min?: number | undefined;
  /** @internal Derived from `duration` — not user-settable. */
  max?: number | undefined;
  /** Leading+trailing throttle (ms) for `onValueChange` during drag. */
  changeThrottle?: number | undefined;
}

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

/** Time-domain slider: maps media time/buffer state to slider state. */
export class TimeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<TimeSliderProps> = {
    ...SliderCore.defaultProps,
    label: 'Seek',
    changeThrottle: 100,
  };

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
    const { dragging, dragPercent } = this.input;

    // Override min/max for time domain, forwarding all user props so disabled/thumbAlignment aren't lost.
    super.setProps({ ...this.#props, min: 0, max: duration });

    // Raw precision during drag for smooth scrubbing — step snapping only applies to keyboard.
    const value = dragging ? clamp((dragPercent / 100) * duration, 0, duration) : currentTime;
    const base = super.getSliderState(value);

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
