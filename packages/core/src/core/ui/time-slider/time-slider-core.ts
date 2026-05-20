import { defaults } from '@videojs/utils/object';
import { formatDuration, type TimeFormatOptions } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { SliderCore, type SliderProps, type SliderState } from '../slider/slider-core';
import type { TranslationKeyOrString } from '../types';

export interface TimeSliderProps extends SliderProps {
  /** @internal Derived from `currentTime` — not user-settable. */
  value?: number | undefined;
  /** @internal Always 0 — not user-settable. */
  min?: number | undefined;
  /** @internal Derived from `duration` — not user-settable. */
  max?: number | undefined;
  /** Leading+trailing throttle (ms) for `onValueChange` during drag. */
  changeThrottle?: number | undefined;
  /** Options for `formatDuration` when building the slider thumb `aria-valuetext`. */
  formatOptions?: TimeFormatOptions | undefined;
}

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

/** Time-domain slider: maps media time/buffer state to slider state. */
export class TimeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<Omit<TimeSliderProps, 'formatOptions'>> = {
    ...SliderCore.defaultProps,
    label: '',
    changeThrottle: 100,
  };

  #props: TimeSliderProps = { ...TimeSliderCore.defaultProps };
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

  override getLabel(state: SliderState): TranslationKeyOrString {
    return super.getLabel(state) || 'seek';
  }

  #announceValue(state: TimeSliderState): number {
    return state.dragging ? this.rawValueFromPercent(state.pointerPercent) : state.value;
  }

  getValueText(state: TimeSliderState): TranslationKeyOrString {
    return Number.isFinite(state.duration) ? 'timeSliderValueTextRange' : this.getValueTextParams(state).current;
  }

  getValueTextParams(state: TimeSliderState): { current: string; duration: string } | { current: string } {
    const formatOptions = this.#props.formatOptions;
    const current = formatDuration(this.#announceValue(state), formatOptions);
    if (!Number.isFinite(state.duration)) {
      return { current };
    }
    return {
      current,
      duration: formatDuration(state.duration, formatOptions),
    };
  }

  override getAttrs(state: TimeSliderState) {
    const base = super.getAttrs(state);
    const announceValue = this.#announceValue(state);

    return {
      ...base,
      'aria-valuenow': announceValue,
      'aria-valuetext': this.getValueText(state),
    };
  }
}

export namespace TimeSliderCore {
  export type Props = TimeSliderProps;
  export type State = TimeSliderState;
}
