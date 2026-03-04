import { clamp } from '@videojs/utils/number';
import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaTimeState } from '../../media/state';
import { type SliderBaseProps, SliderCore, type SliderState } from '../slider/slider-core';
import type { UICore } from '../types';

export interface TimeSliderProps extends SliderBaseProps {
  /** Trailing-edge throttle (ms) for seek requests during drag. */
  commitThrottle?: number | undefined;
}

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  bufferPercent: number;
}

/** Max time (ms) to hold the pending seek position before giving up. */
const PENDING_SEEK_TIMEOUT = 5_000;

export class TimeSliderCore extends SliderCore implements UICore<TimeSliderProps, TimeSliderState> {
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
  #pendingSeekTime: number | null = null;
  #pendingSeekTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props?: TimeSliderProps) {
    super();
    if (props) this.setProps(props);
  }

  override setProps(props: TimeSliderProps): void {
    this.#props = defaults(props, TimeSliderCore.defaultProps);
    super.setProps({ ...props, min: 0 });
  }

  /**
   * Commit a seek at the given percent. Holds the slider at the target position
   * until the seek resolves, preventing visual snap-back to stale `currentTime`.
   */
  commitSeek(percent: number, seek: (time: number) => Promise<number>): void {
    const seconds = this.valueFromPercent(percent);
    this.#setPendingSeek(seconds);
    seek(seconds).then(
      () => this.#clearPendingSeek(),
      () => this.#clearPendingSeek()
    );
  }

  getState(media: MediaTimeState & MediaBufferState): TimeSliderState {
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

    const state: TimeSliderState = {
      ...base,
      currentTime,
      duration,
      seeking,
      bufferPercent,
    };

    // Hold slider at committed position while the async seek settles.
    const pending = this.#pendingSeekTime;
    if (!dragging && pending !== null) {
      const dur = duration || 1;
      return { ...state, value: pending, fillPercent: (pending / dur) * 100 };
    }

    return state;
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

  #setPendingSeek(time: number): void {
    this.#pendingSeekTime = time;

    if (this.#pendingSeekTimer !== null) {
      clearTimeout(this.#pendingSeekTimer);
    }

    this.#pendingSeekTimer = setTimeout(() => this.#clearPendingSeek(), PENDING_SEEK_TIMEOUT);
  }

  #clearPendingSeek(): void {
    this.#pendingSeekTime = null;

    if (this.#pendingSeekTimer !== null) {
      clearTimeout(this.#pendingSeekTimer);
      this.#pendingSeekTimer = null;
    }
  }
}

export namespace TimeSliderCore {
  export type Props = TimeSliderProps;
  export type State = TimeSliderState;
}
