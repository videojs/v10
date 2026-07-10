import { defaults } from '@videojs/utils/object';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaPlaybackState, MediaTimeState } from '../../media/state';
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
  /**
   * When true, pause playback while the user is dragging the thumb,
   * resuming on release if it was playing before.
   */
  pauseOnDrag?: boolean | undefined;
}

export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  /** Buffered amount as a percentage of duration (0–100). */
  bufferPercent: number;
}

/** Time-domain slider: maps media time/buffer state to slider state. */
export class TimeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<TimeSliderProps> = {
    ...SliderCore.defaultProps,
    label: '',
    changeThrottle: 100,
    pauseOnDrag: false,
  };

  #props: TimeSliderProps = { ...TimeSliderCore.defaultProps };
  #media: (MediaTimeState & MediaBufferState) | null = null;
  #formatLocale: string | string[] | undefined;
  #wasPlayingBeforeDrag = false;

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

  /** @internal Platform adapters set the active i18n locale for `aria-valuetext` time formatting. */
  setFormatLocale(locale: string | string[] | undefined): void {
    this.#formatLocale = locale;
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

  #announceValue(state: TimeSliderState): number {
    return state.dragging ? this.rawValueFromPercent(state.pointerPercent) : state.value;
  }

  #formatTimeAsPhrase(seconds: number): string {
    return this.#formatLocale === undefined
      ? formatTimeAsPhrase(seconds)
      : formatTimeAsPhrase(seconds, { locale: this.#formatLocale });
  }

  getValueText(state: TimeSliderState): string {
    return Number.isFinite(state.duration) ? '{current} of {duration}' : this.getValueTextParams(state).current;
  }

  getValueTextParams(state: TimeSliderState): { current: string; duration: string } | { current: string } {
    const current = this.#formatTimeAsPhrase(this.#announceValue(state));
    if (!Number.isFinite(state.duration)) {
      return { current };
    }
    return {
      current,
      duration: this.#formatTimeAsPhrase(state.duration),
    };
  }

  /**
   * Pause playback when a drag begins if `pauseOnDrag` is enabled, remembering
   * whether media was playing so `endDrag` can resume it.
   */
  startDrag(playback: MediaPlaybackState | null | undefined): void {
    this.#wasPlayingBeforeDrag = false;
    if (this.#props.pauseOnDrag && playback && !playback.paused) {
      this.#wasPlayingBeforeDrag = true;
      playback.pause();
    }
  }

  /**
   * Resume playback if `startDrag` paused it. Resume depends only on the intent
   * captured at drag start, so it survives `pauseOnDrag` being toggled mid-drag.
   * Safe to call on teardown — a no-op unless a drag paused playback.
   */
  endDrag(playback: MediaPlaybackState | null | undefined): void {
    if (this.#wasPlayingBeforeDrag) {
      playback?.play().catch(() => {
        // Resume play() can reject (autoplay policy, etc.) — surface via existing error feature.
      });
    }
    this.#wasPlayingBeforeDrag = false;
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
