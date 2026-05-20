import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { SliderCore, type SliderProps, type SliderState } from '../slider/slider-core';

/** Props for the time slider core. */
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

/** Reactive state surfaced by the time slider core. */
export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

/** Time-domain slider: maps media time/buffer state to slider state. */
export class TimeSliderCore extends SliderCore {
  /** Default values applied when a prop is omitted. */
  static override readonly defaultProps: NonNullableObject<TimeSliderProps> = {
    ...SliderCore.defaultProps,
    label: 'Seek',
    changeThrottle: 100,
  };

  #props = { ...TimeSliderCore.defaultProps };
  #media: (MediaTimeState & MediaBufferState) | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: TimeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  /** Update props on the core. */
  override setProps(props: TimeSliderProps): void {
    this.#props = defaults(props, TimeSliderCore.defaultProps);
    super.setProps({ ...props, min: 0 });
  }

  /** Bind the core to a media time and buffer state source. */
  setMedia(media: MediaTimeState & MediaBufferState): void {
    this.#media = media;
  }

  /** Recompute and return the current state. */
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

  /** Resolve the slider's ARIA label, defaulting to "Seek". */
  override getLabel(state: SliderState): string {
    return super.getLabel(state) || 'Seek';
  }

  /** Compute ARIA attributes including a spoken `aria-valuetext` of the seek target. */
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
  /** Alias for {@link TimeSliderProps}. */
  export type Props = TimeSliderProps;
  /** Alias for {@link TimeSliderState}. */
  export type State = TimeSliderState;
}
